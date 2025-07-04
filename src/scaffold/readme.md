# mela-gc
Help create component

## usage:
1. Step into your project directory, such as `productstore`.(`cd ~/Documents/code-repo/DEP-Phase1/fe-library/productstore`)
2. Then input commond `mela-gc` (**gc** is short for **generate component**)
    1. select your scope(such as `organisms`)
    2. input your module(such as `aaa-bbb/ccc-ddd`)
    3. make sure if you want to create a vue component or html component
    4. you will see your component auto created

# mela-ga
Help create api

## usage:
1. Step into your project directory, such as `productstore`.(`cd ~/Documents/code-repo/DEP-Phase1/fe-library/productstore`)
2. Then input commond `mela-ga` (**ga** is short for **generate api**)
    1. input your module(such as `aaa-bbb-ccc`)
    2. you will see your api auto created

# mela-gs
Help create store

## usage:
1. Step into your project directory, such as `productstore`.(`cd ~/Documents/code-repo/DEP-Phase1/fe-library/productstore`)
2. Then input commond `mela-gs` (**gs** is short for **generate store**)
    1. input your module(such as `xxx-yyy`)
    2. you will see your store auto created

# mela-sss
Help sort scss selector

1. Step into your project directory, such as `productstore`.(`cd ~/Documents/code-repo/DEP-Phase1/fe-library/productstore`)
2. Then input commond `mela-sss relative/path/to/your/scss-file.scss`   (**sss** is short for **sort scss selector**)
3. Then you will see your `mela-sss relative/path/to/your/scss-file.scss` automatic alphabetical sorting

> Execute the mela-sss command in batches, as below:
```bash
cd path/to/fe-library/dsibo    （or productstore）
# then execute below:
find source/scss/build/molecules/ -name "_*.scss" -exec mela-sss {} \;
```
