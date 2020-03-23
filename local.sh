#! /bin/sh

npm run docs:build

cd dist

git init
git add -A .
git commit -m 'deploy'

git push -f git@github.com:ReliaMM/FHBlog.git master:gh-pages


