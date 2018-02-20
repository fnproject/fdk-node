set -ex

# ensure working dir is clean
# git status
# if [[ -z $(git status -s) ]]
# then
#   echo "tree is clean"
# else
#   echo "tree is dirty, please commit changes before running this"
#   exit 1
# fi

# git pull

version_file="package.json"
# Bump version, patch by default - also checks if previous commit message contains `[bump X]`, and if so, bumps the appropriate semver number - https://github.com/treeder/dockers/tree/master/bump
docker run --rm -it -v $PWD:/app -w /app treeder/bump --filename $version_file "$(git log -1 --pretty=%B)"
version=$(grep -m1 -Eo "[0-9]+\.[0-9]+\.[0-9]+" $version_file)
echo "Version: $version"

tag="$version"
git add -u
git commit -m "$version release [skip ci]"
# todo: might make sense to move this into it's own repo so it can have it's own versioning at some point
git tag -f -a $tag -m "version $version"
git push
git push origin $tag

npm publish
