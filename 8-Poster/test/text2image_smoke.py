#!/usr/bin/env python3
"""
百炼文生图冒烟测试：读取 poster/.env 中的 DASHSCOPE_API_KEY、DASHSCOPE_MODEL，
调用异步 image-synthesis 接口并轮询任务直到 SUCCEEDED / FAILED。

用法（在 poster/ 或任意目录）:
  python3 test/text2image_smoke.py
  python3 test/text2image_smoke.py "一只橘猫，水彩风格"
依赖: Python 3.9+，仅标准库。
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# poster/.env（相对本脚本所在目录的上一级）
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
_DEFAULT_BASE = "https://dashscope.aliyuncs.com"
_SUBMIT_PATH = "/api/v1/services/aigc/text2image/image-synthesis"
_POLL_INTERVAL_SEC = 2.0
_POLL_MAX_ATTEMPTS = 90


def load_dotenv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        raise FileNotFoundError(f"找不到环境文件: {path}")
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        env[k] = v
    return env


def http_json(method: str, url: str, headers: dict[str, str], body: object | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    for hk, hv in headers.items():
        req.add_header(hk, hv)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            text = resp.read().decode("utf-8")
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(err_body)
        except json.JSONDecodeError:
            parsed = {"raw": err_body}
        raise RuntimeError(f"HTTP {e.code} {e.reason}: {parsed}") from e


def main() -> int:
    prompt = "海报配图：简洁扁平插画，一杯咖啡和一本书，暖色调"
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:]).strip() or prompt

    env = load_dotenv(_ENV_FILE)
    api_key = env.get("DASHSCOPE_API_KEY", "").strip()
    model = env.get("DASHSCOPE_MODEL", "qwen-image-plus").strip()
    base = env.get("DASHSCOPE_BASE_URL", _DEFAULT_BASE).strip().rstrip("/")

    if not api_key or api_key == "your-api-key":
        print("请在 poster/.env 中设置有效的 DASHSCOPE_API_KEY", file=sys.stderr)
        return 1

    submit_url = base + _SUBMIT_PATH
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "X-DashScope-Async": "enable",
    }
    payload = {
        "model": model,
        "input": {"prompt": prompt},
        "parameters": {
            "size": "1024*1024",
            "n": 1,
            "prompt_extend": True,
            "watermark": False,
        },
    }

    print(f"env: {_ENV_FILE}")
    print(f"base: {base}")
    print(f"model: {model}")
    print(f"prompt: {prompt[:80]}{'…' if len(prompt) > 80 else ''}")
    print("提交任务…")

    try:
        create_rsp = http_json("POST", submit_url, headers, payload)
    except RuntimeError as e:
        print(f"创建任务失败: {e}", file=sys.stderr)
        return 1

    out = create_rsp.get("output") or {}
    task_id = out.get("task_id")
    if not task_id:
        print(f"未返回 task_id，完整响应:\n{json.dumps(create_rsp, ensure_ascii=False, indent=2)}", file=sys.stderr)
        return 1

    print(f"task_id: {task_id}")
    print("轮询任务状态…")

    task_url = f"{base}/api/v1/tasks/{task_id}"
    poll_headers = {
        "Authorization": f"Bearer {api_key}",
    }

    for i in range(_POLL_MAX_ATTEMPTS):
        time.sleep(_POLL_INTERVAL_SEC if i else 0.5)
        try:
            status_rsp = http_json("GET", task_url, poll_headers)
        except RuntimeError as e:
            print(f"查询失败: {e}", file=sys.stderr)
            return 1

        sout = status_rsp.get("output") or {}
        st = sout.get("task_status")
        print(f"  [{i + 1}] {st}")

        if st == "SUCCEEDED":
            results = sout.get("results") or []
            urls = [r.get("url") for r in results if isinstance(r, dict) and r.get("url")]
            if urls:
                print("图片 URL:")
                for u in urls:
                    print(f"  {u}")
            else:
                print(json.dumps(status_rsp, ensure_ascii=False, indent=2))
            return 0

        if st == "FAILED":
            print(
                json.dumps(
                    {
                        "task_status": st,
                        "code": sout.get("code"),
                        "message": sout.get("message"),
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                file=sys.stderr,
            )
            return 1

    print("轮询超时，请稍后在控制台用同一 task_id 手动查询。", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
