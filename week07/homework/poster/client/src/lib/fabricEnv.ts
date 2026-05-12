import { config } from "fabric";

let didConfigure = false;

/**
 * 在应用内首次创建 Fabric Canvas 之前执行。
 * 打开 `enableGLFiltering` 后，对图片等对象应用 Fabric 内置滤镜时会走 GPU（WebGL）管线，
 * 比纯 CPU 像素循环更省主线程时间，多滤镜叠加时更不容易拖垮页面。
 *
 * 说明：具体 WebGL 版本由浏览器与 Fabric 实现决定；`textureSize` 过大在低端机会增加显存压力，
 * 默认 2048 与 Fabric 文档建议一致，可按设备档位再调。
 */
export function configureFabricRuntime(): void {
  if (didConfigure) return;
  didConfigure = true;
  config.configure({
    enableGLFiltering: true,
    textureSize: 2048,
  });
}

configureFabricRuntime();
