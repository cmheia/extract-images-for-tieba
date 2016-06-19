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
// @license     MPL
// ==/UserScript==
(function () {
	// AJAX lib
	var AJAX_FINISHED           =  0;
	var AJAX_NO_BROWSER_SUPPORT = -1;
	var AJAX_STARTING           = -2;
	var AJAX_PARTIAL_PROGRESS   = -3;
	var AJAX_FAILED             = -4;

	var getXHR = function () {
		var xhr = false;
		if (window.XMLHttpRequest) {
			xhr = new XMLHttpRequest();
		}
		if (!xhr) {
			return false;
		}
		return xhr;
	};

	var makeRequest = function (url, requestType, payload, callback) {
		if (typeof callback !== "function") {
			alert("说好的回调呢 ٩͡[๏̯͡๏]");
			return false;
		}
		var xhr = getXHR();
		if (xhr) {
			xhr.onreadystatechange = function () {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						callback(xhr, AJAX_FINISHED);
					} else {
						callback(xhr, AJAX_FAILED);
					}
				}
			};
			xhr.open(requestType, url, true);
			if (requestType == "POST") {
				xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded;");
			}
			xhr.send(payload);
			callback(xhr, AJAX_STARTING);
		} else {
			callback(xhr, AJAX_NO_BROWSER_SUPPORT);
		}
		return xhr;
	};

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
		var parseRespond = function (xhr, status) {
			if (xhr) {
				if (AJAX_FINISHED === status) {
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
				} else if (AJAX_FAILED === status) {
					parsedPages++;
				}
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

		for (var i = 1; i <= pages; i++) {
			var url = window.location.origin + window.location.pathname + "?pn=" + i;
			makeRequest(url, "GET", null, parseRespond);
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
