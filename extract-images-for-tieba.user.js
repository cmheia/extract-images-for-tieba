// ==UserScript==
// @name        Extract images for tieba.baidu.com
// @name:zh     贴吧壁纸收割机
// @namespace   https://github.com/cmheia/extract-images-for-tieba
// @description Adds a button that get all attached images as original size to every post.
// @include     http://tieba.baidu.com/p/*
// @author      cmheia
// @version     0.0.1
// @icon        http://tb1.bdstatic.com/tb/favicon.ico
// @grant       GM_setClipboard
// @grant       GM_xmlhttpRequest
// @license     MPL
// ==/UserScript==
(function () {
	// 去重
	var doUnique = function (arr) {
		var result = [], hash = {};
		for (var i = 0, elem; (elem = arr[i]) !== undefined; i++) {
			if (!hash[elem]) {
				result.push(elem);
				hash[elem] = true;
			}
		}
		return result;
	};

	// 取得分页数量
	var getPages = function () {
		return parseInt(document.getElementsByClassName('l_posts_num')[0].childNodes[3].getElementsByTagName("span")[1].innerText);
	};

	// 取得单个分页原图链接
	var extractSinglePage = function (content) {
		var imageSrcArray = [];
		var regexImageTag = new RegExp(/<img[^<>]*class=\"BDE_Image\"[^<>]*src\=\"((http|https):\/\/)imgsrc\.baidu\.com[\w\d\/\.\-\%\=]*(jpg|jpeg|gif|png|webp)\"([^<>]*)>/, "gi");
		var regexImageSrc = new RegExp(/((http|https):\/\/)+(\w+\.)+(\w+)[\w\/\.\-\%\=]*(jpg|jpeg|gif|png|webp)/, "gi");
		var regexImageId = new RegExp(/([\w\d]+)\.(jpg|jpeg|gif|png|webp)$/, "gi");
		var images = content.match(regexImageTag);
		if (null !== images) {
			for (var i = 0; i < images.length; i++) {
				var currentImageSrc = images[i].match(regexImageSrc);
				if (null !== currentImageSrc && 1 === currentImageSrc.length) {
					imageSrcArray.push("http://imgsrc.baidu.com/forum/pic/item/" + currentImageSrc[0].match(regexImageId)[0]);
				}
			}
		}

		var result = doUnique(imageSrcArray);
		if (null === result || 0 === result.length) {
			return null;
		}
		return result;
	};

	// 取得所有分页原图链接
	var extractAllPages = function (pages) {
		var imageSrcArray = [];
		var parsedPages = 0;
		var parseRespond = function (xhr) {
			if (xhr) {
				var regexImageTag = new RegExp(/<img[^<>]*class=\"BDE_Image\"[^<>]*src\=\"((http|https):\/\/)imgsrc\.baidu\.com[\w\d\/\.\-\%\=]*(jpg|jpeg|gif|png|webp)\"([^<>]*)>/, "gi");
				var regexImageSrc = new RegExp(/((http|https):\/\/)+(\w+\.)+(\w+)[\w\/\.\-\%\=]*(jpg|jpeg|gif|png|webp)/, "gi");
				var regexImageId = new RegExp(/([\w\d]+)\.(jpg|jpeg|gif|png|webp)$/, "gi");
				var images = xhr.response.match(regexImageTag);
				if (null !== images) {
					for (var i = 0; i < images.length; i++) {
						var currentImageSrc = images[i].match(regexImageSrc);
						if (null !== currentImageSrc && 1 === currentImageSrc.length) {
							imageSrcArray.push("http://imgsrc.baidu.com/forum/pic/item/" + currentImageSrc[0].match(regexImageId)[0]);
						}
					}
				}
				parsedPages++;
				if (pages === parsedPages) {
					var result = doUnique(imageSrcArray);
					if (null === result || 0 === result.length) {
						document.getElementById("extracted").innerHTML = "然而并没有图片 (╯#-_-)╯~~~~~~~~~~~~~~~~~╧═╧";
					} else {
						document.getElementById("extracted").innerHTML = "搞到这 " + result.length + " 张图啦 （⺻▽⺻ ）";
						GM_setClipboard(result.sort().join("\r\n"));
					}
				}
			}
		};
		var xhrErrorHandler = function (xhr) {
			parsedPages++;
		};

		for (var i = 1; i <= pages; i++) {
			var url = window.location.origin + window.location.pathname + "?pn=" + i;
			GM_xmlhttpRequest({
				method:  'GET',
				url:     url,
				onload:  parseRespond,
				onerror: xhrErrorHandler
			});
		}
	};

	// 仅收割当前分页
	var extracterImage = function () {
		var message = document.getElementById("extracted");
		var result = extractSinglePage(document.getElementsByClassName("p_postlist")[0].innerHTML);
		if (null !== result && 0 < result.length) {
			message.innerHTML = "搞到这页的 " + result.length + " 张图啦 （⺻▽⺻ ）";
			GM_setClipboard(result.join("\r\n"));
		} else {
			message.innerHTML = "然而并不能收割 (╯#-_-)╯~~~~~~~~~~~~~~~~~╧═╧";
		}
	};

	// 收割全部分页
	var extracterImages = function () {
		var pages = getPages();
		var message = document.getElementById("extracted");
		if (0 === pages) {
			message.innerHTML = "度娘又改版了 (╯#-_-)╯~~~~~~~~~~~~~~~~~╧═╧";
		} else if (1 === pages) {
			var result = extractSinglePage(document.getElementsByClassName("p_postlist")[0].innerHTML);
			if (null !== result && 0 < result.length) {
				message.innerHTML = "搞到这" + result.length + "张图啦 （⺻▽⺻ ）";
				GM_setClipboard(result.join("\r\n"));
			} else {
				message.innerHTML = "然而并不能收割 (╯#-_-)╯~~~~~~~~~~~~~~~~~╧═╧";
			}
		} else {
			extractAllPages(pages);
			message.innerHTML = "正在搞这 " + pages + " 页图，不要急嘛 (๑•̀_•́๑)";
		}
	};

	// 添加按钮
	var addButton = function () {
		var button = document.createElement('li');
		button.innerHTML="<a href='javascript:;' style='margin:0 8px;'>收割</a><span id='extracted'></span>";
		button.class = "l_reply_num";
		button.addEventListener("click", extracterImages);
		document.addEventListener("keydown", function (event) {
			// F9 = 120
			// F10 = 121
			if (120 === event.keyCode) {
				extracterImage();
			} else if (121 === event.keyCode) {
				extracterImages();
			}
		}, true);
		document.getElementsByClassName('l_posts_num')[0].appendChild(button);
	};

	// 运行
	addButton();
}) ();
