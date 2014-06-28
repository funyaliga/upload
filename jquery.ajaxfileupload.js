;(function($) {
	$.fn.fUpload = function(options) {
		
		var _this,
		    $that = $(this);

		var defaults = {
			action:     "upload.php",
			view: 		'.view',
			onChange:   function(filename) {},
			onSubmit:   function(filename) {},
			onprogress: function(data) {},
			onComplete: function(filename, data) {}
		},
		opt = $.extend({}, defaults, options);

		var randomId = (function() {
			var id = 0;
			return function () {
				return "_AjaxFileUpload" + id++;
			};
		})();
		
		var $view = $(opt.view), //预览图
			t_progress; //时间

		return this.each(function() {
			var $this = $(this);
			if ($this.is("input") && $this.attr("type") === "file") {
				$this.bind("change", function(e){
					typeof window.FormData != 'undefined' ? h5Change(e) : onChange(e);
				});
			}
		});

		// html5 change
		function h5Change(e){
			var _element = e.target,
				file 	 = _element.files[0],
				url  =  window.URL.createObjectURL(file);  //获取文件地址
			
			_this = _element;

			// 预览图片
			fr = new FileReader();
			fr.onload = function (e) {
				$view.length && $view.html('<img src="'+e.target.result+'">')
			};
			fr.readAsDataURL(file);

			// callback onchagne
			opt.onChange.call(_this, file.name);

			h5Submit(file)
		}

		function h5Submit(file){
			var data = opt.onSubmit.call(_this, file.name);
			if (data  === false) {
				return false;
			} else {
				var fd = new FormData()
				fd.append('Filedata',file);

				for (var variable in data) {
					fd.append(variable,data[variable]);
				}  

				var xhr = new XMLHttpRequest();
				xhr.open("POST", opt.action, true);

				// 进度条
				xhr.upload.addEventListener('progress', onprogress, false);

				// 请求完成时
				xhr.onreadystatechange = function(e) {
					if ( xhr.readyState == 4 && xhr.status == 200 ) {
						var data = JSON.parse(xhr.responseText);

						clearInterval(t_progress);
						opt.onprogress.call(_this, 100);

						opt.onComplete.call(_this, file.name, data);
					}
				}

				xhr.send(fd);
			}
		}

		function onprogress(event) {
			var percent = 0;  
			if(event && event.lengthComputable) {
				percent = (event.loaded / event.total) * 90;
				opt.onprogress.call(_this, percent);
			} else {
				t_progress = setInterval(function(){
					if(percent>=90){
						clearInterval(t_progress);
						return false;
					}

					percent = percent + 18;
					opt.onprogress.call(_this, percent);
				},2500)
			}
		}

		function onChange(e) {
			var fname = randomId();

			var $element = $(e.target),
				id       = $element.attr('id'),
				$clone   = $element.removeAttr('id').clone().attr('id', id).fUpload(options),
				filename = $element.val().replace(/.*(\/|\\)/, ""),
				iframe   = $('<iframe src="javascript:false;" name="' + fname + '" id="' + fname + '" style="display: none;"></iframe>')
							.appendTo("body"),
				form     = $("<form />")
							.attr({
								method: "post",
								action: opt.action,
								enctype: "multipart/form-data",
								target: fname
							})
							.hide()
							.appendTo("body");

			if($view.length){
				// ie6 预览图
				if ($.browser.version == "6.0") {
					$view.append('<img src="file:///' + e.target.value + '" alt="" />')
				// ie7-9
				} else {
					$that.select(); //ie8-9要select
					$that.blur(); //防止拒绝访问
					var localpath = document.selection.createRange().text;

					var $img = $("<img />").appendTo($view);

					$img.get(0).style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod='image',src=\"" + localpath + "\")";
					$img.get(0).src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
				}
			}


			// 我们追加一个克隆，因为原来的输入将被销毁
			$clone.insertBefore($element);

			opt.onChange.call($clone[0], filename);

			iframe.bind("load", {element: $clone, form: form, filename: filename}, onComplete);
			
			form.append($element).on("submit", {element: $clone, iframe: iframe, filename: filename}, onSubmit).submit();
		}
		
		function onSubmit(e) {
			_this = e.data.element;
			var data = opt.onSubmit.call(e.data.element, e.data.filename);

			// return: false: 取消提交
			if (data === false) {
				// 删除临时表格和iframe
				$(e.target).remove();
				e.data.iframe.remove();
				return false;
			} else {
				// return: 数据，，提交参数
				for (var variable in data) {
					$("<input />")
						.attr("type", "hidden")
						.attr("name", variable)
						.val(data[variable])
						.appendTo(e.target);
				}

				onprogress()
			}
		}
		
		function onComplete (e) {
			var $iframe  = $(e.target),
				doc      = ($iframe[0].contentWindow || $iframe[0].contentDocument).document,
				response = doc.body.innerHTML;

			if (response) {
				response = $.parseJSON(response);
			} else {
				response = {};
			}

			clearInterval(t_progress);
			opt.onprogress.call(e.data.element, 100);
			opt.onComplete.call(e.data.element, e.data.filename, response);
			
			// 删除临时表格和iframe
			e.data.form.remove();
			$iframe.remove();
		}

	};
})(jQuery);