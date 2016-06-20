// ==UserScript==
// @name        Extract images for tieba.baidu.com
// @name:zh     贴吧壁纸收割机
// @namespace   https://github.com/cmheia/extract-images-for-tieba
// @description Adds a button that get all attached images as original size to every post.
// @include     http://tieba.baidu.com/p/*
// @author      cmheia
// @version     0.2.0
// @icon        http://tb1.bdstatic.com/tb/favicon.ico
// @grant       GM_setClipboard
// @grant       GM_xmlhttpRequest
// @license     MPL
// ==/UserScript==
(function () {
	var $id = function (o) {
		return document.getElementById(o);
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

	// 插入样式表
	var apendStyle = function (cssText) {
		var head = document.head || document.getElementsByTagName('head')[0];
		var style = document.createElement('style');
		style.type = 'text/css';
		var textNode = document.createTextNode(cssText);
		style.appendChild(textNode);
		head.appendChild(style);
	};

	// 创建样式表
	var addStyle = function () {
		apendStyle(".margin8 {margin:8px;} .preview_item {padding:3px;float:left;position:relative;} .preview_box {max-width:300px;max-height:300px;} .preview_container {z-index:11000;} .preview_selector {position:absolute;left:0;} .preview_excluded {background:#FFCCFF;}");
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
	var extractAllPages = function (pages, auto) {
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
						$id("extracted").innerHTML = "然而并没有图片 (╯#-_-)╯~~~~~~~~~~~~~~~~~╧═╧";
					} else {
						exportAlbum(result, auto);
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
	var extracterImage = function (auto) {
		var message = $id("extracted");
		var result = extractSinglePage(document.getElementsByClassName("p_postlist")[0].innerHTML);
		if (null !== result && 0 < result.length) {
			exportAlbum(result, auto);
		} else {
			message.innerHTML = "然而并不能收割 (╯#-_-)╯~~~~~~~~~~~~~~~~~╧═╧";
		}
	};

	// 收割全部分页
	var extracterImages = function (auto) {
		var pages = getPages();
		var message = $id("extracted");
		if (0 === pages) {
			message.innerHTML = "度娘又改版了 (╯#-_-)╯~~~~~~~~~~~~~~~~~╧═╧";
		} else if (1 === pages) {
			var result = extractSinglePage(document.getElementsByClassName("p_postlist")[0].innerHTML);
			if (null !== result && 0 < result.length) {
				exportAlbum(result, auto);
			} else {
				message.innerHTML = "然而并不能收割 (╯#-_-)╯~~~~~~~~~~~~~~~~~╧═╧";
			}
		} else {
			extractAllPages(pages, auto);
			message.innerHTML = "正在搞这 " + pages + " 页图，不要急嘛 (๑•̀_•́๑)";
		}
	};

	// 新建图集
	var exportAlbum = function (images, auto) {
		if (null === images || 0 === images.length) {
			return;
		}
		var imageCount = images.length;

		if (auto) {
			GM_setClipboard(images.join("\r\n"));
			$id("extracted").innerHTML = "搞到这" + imageCount + "张图啦 （⺻▽⺻ ）";
			return;
		}

		// 删除图集
		var removeAlbum = function () {
			if (null !== $id("preview_window")) {
				document.body.removeChild($id("preview_window"));
				$id("extracted").innerHTML = "";
			}
		};

		// 恢复被隐藏的元素
		var showOtherElements = function (imags) {
			for (var i = 0; i < document.body.childNodes.length; i++) {
				if ("DIV" === document.body.childNodes[i].tagName && "y" === document.body.childNodes[i].getAttribute("data-hide")) {
					document.body.childNodes[i].style.display = "";
				}
			}
			document.getElementsByClassName("tbui_aside_float_bar")[0].style.display = "";
		};

		// 隐藏无关元素
		var hideOtherElements = function () {
			for (var i = 0; i < document.body.childNodes.length; i++) {
				if ("DIV" === document.body.childNodes[i].tagName && "com_userbar_message" !== document.body.childNodes[i].id) {
					document.body.childNodes[i].style.display = "none";
					document.body.childNodes[i].setAttribute("data-hide", "y");
				}
			}
			document.getElementsByClassName("tbui_aside_float_bar")[0].style.display = "none";
		};

		// 导出选中图片链接
		var exportSelected = function () {
			var items = $id("preview_list");
			var counts = items.childNodes.length;
			var result = [];
			for (var i = 0; i < counts; i++) {
				if (items.childNodes[i].childNodes[1].checked) {
					result.push(items.childNodes[i].childNodes[0].src);
				}
			}
			if (0 < result.length) {
				GM_setClipboard(result.join("\r\n"));
				$id("export_msg").innerHTML = "搞到这" + result.length + "张图啦 （⺻▽⺻ ）";
			} else {
				$id("export_msg").innerHTML = "至少选择一张图吧 ◔ ‸◔？";
			}
		};

		// 关闭图片墙
		var closePreviewWindow = function () {
			showOtherElements();
			$id("preview_window").style.display = "none";
		};

		// 选中全部图片
		var previewSelectAll = function () {
			var items = $id("preview_list");
			var counts = items.childNodes.length;
			var result = [];
			for (var i = 0; i < counts; i++) {
				items.childNodes[i].childNodes[1].checked = true;
				items.childNodes[i].className = "preview_item";
			}
			$id("previewer_selected").innerHTML = counts;
		};

		// 反选
		var previewSelectInvert = function () {
			var items = $id("preview_list");
			var counts = items.childNodes.length;
			var result = [];
			for (var i = 0; i < counts; i++) {
				items.childNodes[i].childNodes[1].checked = !items.childNodes[i].childNodes[1].checked;
				items.childNodes[i].className = (items.childNodes[i].childNodes[1].checked)? "preview_item": "preview_item preview_excluded";
			}
			$id("previewer_selected").innerHTML = counts - parseInt($id("previewer_selected").innerHTML);
		};

		// 点击图片切换选中状态
		var previewSelector = function (o) {
			o.nextSibling.checked = !o.nextSibling.checked;
			var selected = $id("previewer_selected");
			selected.innerHTML = parseInt(selected.innerHTML) + ((o.nextSibling.checked === true)? 1: -1);
			if (o.nextSibling.checked) {
				o.parentNode.className = "preview_item";
			} else {
				o.parentNode.className = "preview_item preview_excluded";
			}
		};

		// 创建控制栏
		var controller = document.createElement('div');
		controller.id = "previewer_ctrl";
		controller.style = "position:relative";

		var info = document.createElement('span');
		info.id = "previewer_info";
		info.className = "margin8";
		info.innerHTML = "共<span class='red'>" + imageCount + "</span>图，已选<span id='previewer_selected' class='red'>" + imageCount + "</span>图";
		controller.appendChild(info);

		var buttonClose = document.createElement('a');
		buttonClose.href = "javascript:;";
		buttonClose.className = "margin8";
		buttonClose.innerHTML = "关闭图片墙";
		buttonClose.addEventListener("click", closePreviewWindow);
		controller.appendChild(buttonClose);

		var buttonSelectAll = document.createElement('a');
		buttonSelectAll.href = "javascript:;";
		buttonSelectAll.className = "margin8";
		buttonSelectAll.innerHTML = "全选";
		buttonSelectAll.addEventListener("click", previewSelectAll);
		controller.appendChild(buttonSelectAll);

		var buttonInvert = document.createElement('a');
		buttonInvert.href = "javascript:;";
		buttonInvert.className = "margin8";
		buttonInvert.innerHTML = "反选";
		buttonInvert.addEventListener("click", previewSelectInvert);
		controller.appendChild(buttonInvert);

		var buttonExportSelected = document.createElement('a');
		buttonExportSelected.href = "javascript:;";
		buttonExportSelected.className = "margin8";
		buttonExportSelected.innerHTML = "导出选定图片";
		buttonExportSelected.addEventListener("click", exportSelected);
		controller.appendChild(buttonExportSelected);

		var message = document.createElement('span');
		message.id = "export_msg";
		message.className = "margin8";
		controller.appendChild(message);

		// 创建图片列表
		var itemList = document.createElement('ul');
		itemList.id = "preview_list";

		var previewer = document.createElement('div');
		previewer.id = "preview_matrix";
		previewer.appendChild(itemList);

		for (var i = 0; i < imageCount; i++) {
			var item = document.createElement('li');
			item.innerHTML = "<img id='" + "preview_img_" + i + "' class='preview_box' src='" + images[i] + "'><input type='checkbox' id='" + "preview_cb_" + i + "' class='preview_selector' checked='checked'>";
			item.className = "preview_item";
			item.childNodes[0].addEventListener("click", function () {
				previewSelector(this);
			});
			itemList.appendChild(item);
		}

		// 删除旧的图片墙
		removeAlbum();
		var container = document.createElement('div');
		container.id = "preview_window";
		container.className = "preview_container";
		container.appendChild(controller);
		container.appendChild(previewer);
		hideOtherElements();
		document.body.appendChild(container);

		var button = document.createElement('a');
		button.href = "javascript:;";
		button.innerHTML = "打开图片墙";
		button.addEventListener("click", function () {
			hideOtherElements();
			$id("preview_window").style.display = "";
		});
		$id("extracted").appendChild(button);
	};

	// 添加按钮
	var addButton = function () {
		var button = document.createElement('li');
		button.innerHTML="<a href='javascript:;' class='margin8'>收割</a><span id='extracted'></span>";
		button.class = "l_reply_num";
		button.childNodes[0].addEventListener("click", function () {
			extracterImages(false);
		});
		document.addEventListener("keydown", function (event) {
			// F9 = 120
			// F10 = 121
			if (120 === event.keyCode) {
				extracterImage(true);
			} else if (121 === event.keyCode) {
				extracterImages(true);
			}
		}, true);
		document.getElementsByClassName('l_posts_num')[0].appendChild(button);
	};

	// 运行
	addStyle();
	addButton();
}) ();
