由于确实找不到打包生成js文件后是如何嵌入html和js中的入口  
只好人工给生成的打包文件修改js请求接口。  
1.index.html中的js和css文件很容易辨认，直接修改请求路径即可  
2.index中请求了manifest.[hash].js，  
而其中需要把 a.src=n.p+""+({1:"app"}[e]||e)+ 这句话 改成 a.src="你的cdn域名"+n.p+""+({1:"app"}[e]||e)+  
注意：a，n，p，e，这些字母可能不一样，但是形式大概长这样，而且.src不变  
