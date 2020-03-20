#! /bin/sh

npm run docs:build

git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"

if [ "$ROT_TOKEN" = "" ]; then
  echo "Bye~"
  exit 0
fi

git clone https://$ROT_TOKEN@github.com/ReliaMM/FHBlog.git
npm run docs: build
cd dist

git add -A .
git commit -m 'deploy'

git push -f https://$ROT_TOKEN@github.com/ReliaMM/FHBlog.git master:gh-pages


