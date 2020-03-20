#!/usr/bin/env sh

# 构建项目
npm run docs:build

# 进入生成的文件夹
cd dist

git config --global user.name "ReliaMM"
git config --global user.email "1820184044@qq.com"
git add -A .
git commit -m 'deploy'

git push -f git@github.com:ReliaMM/FHBlog.git master:gh-pages
