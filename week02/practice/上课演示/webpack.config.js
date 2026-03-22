const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "production",
  // 入口
  entry: path.resolve(__dirname, "src/main.ts"),
  // 出口
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "app.js",
    clean: true, // 先清空 dist，然后再输出最新内容，如果生成的文件名是这种："app.[contenthash:8].js"，如果不加 clean: true，每次修改打包的产物都不一样，会累计越来越多
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "public/index.html"),
      filename: "index.html",
    }),
  ],
  devServer: {
    open: true,       // 自动打开浏览器
    port: 3000,       // 指定端口号（默认 8080）
  },
  devtool: process.env.NODE_ENV === 'eval-cheap-module-source-map' ? 'inline-source-map' : false,
  module: {
    // 加载器
    rules: [
      // 规则列表
      {
        test: /\.css$/i, // 匹配 .css 结尾的文件
        use: ["style-loader", "css-loader"], // 使用从后到前的加载器来解析 css 代码和插入到 DOM
      },
      {
        test: /\.less$/i,
        use: [
          // compiles Less to CSS
          "style-loader",
          "css-loader",
          "less-loader",
        ],
      },
      {
        // 针对资源模块（图片，字体文件，图标文件等）处理
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: "asset", // 根据文件大小（8KB）小于：把文件转成 base64 打包进 js 文件中（减少网络请求次数）大于：文件复制到输出的目录下
        generator: {
          // 输出文件时，路径+名字
          filename: "assets/[hash][ext]",
        },
      },
      {
        test: /\.m?[jt]s$/,
        // 排除指定目录里的 js （不进行编译降级）
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-typescript"], // 预设规则
          },
        },
      },
    ],
  },
  resolve: {
    // 让 import 时可以省略 .ts 后缀
    extensions: [".ts", ".js", ".json"],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    }
  }
};