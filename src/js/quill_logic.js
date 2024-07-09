// https://github.com/soccerloway/quill-better-table optional
// https://amourspirit.github.io/Typo.js/spell.html optional
// https://github.com/scrapooo/quill-resize-module in use

// add custom text sizes and fonts
var Size = Quill.import("attributors/style/size");
Size.whitelist = ["8px", "9px", "10px", "11px", "12px", "13px", "14px", "15px", "16px", "17px", "18px", "19px", "20px", "21px", "22px", "23px", "24px", "25px", "26px", "27px", "28px", "29px", "30px"];
Quill.register(Size, true);

var Font = Quill.import("formats/font");
Font.whitelist = ["arial", "calibri", "times"];
Quill.register(Font, true);

var ImageBlot = Quill.import("formats/image");
class StyleImageBlot extends ImageBlot {
	static create(value) {
		let node = super.create();
		console.log(value)
		if (typeof value === "string" && value.includes(";base64,")) {
			node.setAttribute("id", "no_file");
			node.setAttribute("src", value);
			node.setAttribute("class", "computed");
		}
		else if (typeof value === "string") {
			node.setAttribute("src", value);
		}
		else {
			node.setAttribute("id", value.id);
			node.setAttribute("src", value.url);
			node.setAttribute("style", value.style);
			node.setAttribute("class", "computed");
		}
		return node;
	}

	static value(node) {
		return {
			id: node.getAttribute("id"),
			url: node.getAttribute("src"),
			style: node.getAttribute("style")
		};
	}
}
Quill.register(StyleImageBlot);

// var Inline = Quill.import("blots/inline");
// class Meta extends Inline {
// 	static blotName = 'meta';
// 	static tagName = 'META';

// 	static create(value) {
// 		console.log("etst")
// 		const node = super.create(value);
// 		node.setAttribute("name", value.name);
// 		node.setAttribute("content", value.content);
// 		return node;
// 	}

// 	static value(node) {
// 		return {
// 			name: node.getAttribute("name"),
// 			content: node.getAttribute("content")
// 		};
// 	}
// }
// Quill.register(Meta);

Quill.register("modules/resize", window.QuillResizeModule);

// register editor
var quill = new Quill("#editor", 
	{
		modules: {
			toolbar: true,
			table: true,
			resize: {
				locale: {
					center: "center",
				}
			}
		},
		theme: "snow",
	}
);


// set standard font/ font size
var standard_text_size = "14px";
var standard_font = "calibri";
var size_selection = document.getElementById("size_selection");
var body = document.querySelector("body");
size_selection.value = standard_text_size;
document.querySelector(":root").style.setProperty("--font_size", standard_text_size);
document.querySelector(":root").style.setProperty("--font", standard_font);

// function for toggle buttons
function quillFormat(format, style) {
	var format_object = quill.getFormat();

	if (style == undefined) style = true;
	if (format in format_object) var current_style = format_object[format];
	if (current_style == style) quill.format(format, false);
	else quill.format(format, style);
}

// function for indent
function quillIndent(action) {
	var format_object = quill.getFormat();
	if ("indent" in format_object) var current_indent = format_object.indent;
	else current_indent = 0;

	if (action == "increase") new_indent = current_indent +1;
	else if (current_indent != 0) new_indent = current_indent -1;

	quill.format("indent", new_indent);
}

// function for in/decrease size
function quillSize(action) {
	var format_object = quill.getFormat();
	if ("size" in format_object) var current_px = format_object.size;
	else current_px = standard_text_size;

	var current_size = parseInt(current_px.slice(0, -2))

	if (action == "increase" && current_size != 30) new_size = current_size +1;
	else if (action == "decrease" && current_size != 8) new_size = current_size -1;

	quill.format("size", new_size + "px");
	size_selection.value = new_size + "px";
}

// remove format
function removeFormat() {
	var range = quill.getSelection();
	if (range?.length > 0) quill.removeFormat(range.index, range.length);
}

// open color selection box
body.addEventListener("mousedown", hideColorSelection);

var picker = document.querySelector("picker");
var colors = picker.getElementsByTagName("td");
for (var i = 0; i < colors.length; i++) {
	colors[i].addEventListener("click", quillSetColor);
}

function quillColorSelection(id, format) {
	var pos = document.getElementById(id).getBoundingClientRect();
	picker.style.top = pos.top + 30 + "px";
	picker.style.left = pos.left + "px";

	picker.setAttribute("data-format", format);
	picker.style.display = "block";
}

function quillSetColor(e) {
	var color = e.target.style.backgroundColor;
	var format = picker.getAttribute("data-format");

	if (format == "background" && color == "rgb(255, 255, 255)") {
		quill.format("background", false);
		color = "#ffff00";
	}
	else if (format == "color" && color == "rgb(0, 0, 0)") {
		quill.format("color", false);
	}
	else {
		quill.format(format, color);
	}

	var path_class = document.getElementsByClassName(format);
	for (var i = 0; i < path_class.length; i++) {
		path_class[i].setAttribute("fill", color);
	}

	hideColorSelection();
}

function hideColorSelection() {
	picker.style.display = "none";
}


// paste, copy, cut Text functions
async function paste() {
	var clipboard_text = await window.__TAURI__.clipboard.readText();

	var range = quill.getSelection();
	if (range) {
		if (range.length > 0) quill.deleteText(range.index, range.length);

		quill.insertText(range.index, clipboard_text);
	}

	
}

function copySelection(cut) {
	var range = quill.getSelection();
	if (range) {
		if (range.length > 0) {
			var selected_text = quill.getText(range.index, range.length);
			navigator.clipboard.writeText(selected_text);
		}
		if (cut) {
			quill.deleteText(range.index, range.length);
		}
	}
	

	
}

// change size and font dropdowns dynamically and format painter functions
quill.on("selection-change", (e) => {
	if (e != null) {
		var format_object = quill.getFormat();
		if ("size" in format_object) size_selection.value = format_object.size;
		else size_selection.value = standard_text_size;
		if ("font" in format_object) font_selection.value = format_object.font;
		else font_selection.value = "calibri";

		if (selected_formats != false) {
			var formats = Object.keys(selected_formats);
			for (var i = 0; i < formats.length; i++) {
				quill.format(formats[i], selected_formats[formats[i]]);
			}
			formatPainterEnd();
		}

		if (e.length > 0) selectionMenu();
	}
});

// import copied images
quill.on("text-change", async (e) => {
	var new_img = document.getElementById("no_file");
	if (new_img != null) {
		quill.enable(false);
		console.log("text change")
		var {src, id} = await createGithubUrl(new_img.src, "data-url");

		quill.enable(true);

		if (id == undefined) {
			quill.history.undo();
		}
		else {
			new_img.src = src;
			new_img.id = id;
			new_img.classList.add("computed");
		}
	}
});

// format painter
var selected_formats = false;
var editor_el = document.getElementById("editor");
var format_painter = document.getElementById("format_painter");

function formatPainterStart() {
	selected_formats = quill.getFormat();
	editor_el.style.cursor = "copy";
	format_painter.classList.add("active");
}

function formatPainterEnd() {
	selected_formats = false;
	editor_el.style.cursor = "auto";
	format_painter.classList.remove("active");
}

document.addEventListener("keydown", e => { if (e.key) formatPainterEnd(); });


// context and selection menu
var context_menu = document.querySelector("contextmenu");
var selection_menu = document.querySelector("selectionmenu");

var normalizePozition = (mouseX, mouseY, menu, outOfBoundsCorrectionY) => {
	// compute what is the mouse position relative to the container element (body)
	var {
		left: bodyOffsetX,
		top: bodyOffsetY,
	} = body.getBoundingClientRect();

	bodyOffsetX = bodyOffsetX < 0 ? 0 : bodyOffsetX;
	bodyOffsetY = bodyOffsetY < 0 ? 0 : bodyOffsetY;

	var bodyX = mouseX - bodyOffsetX;
	var bodyY = mouseY - bodyOffsetY;

	// check if the element will go out of bounds
	var outOfBoundsOnX = bodyX + menu.offsetWidth > body.offsetWidth;
	var outOfBoundsOnY = bodyY + menu.offsetHeight + outOfBoundsCorrectionY > body.offsetHeight;

	var normalizedX = mouseX;
	var normalizedY = mouseY;

	// normalize
	if (outOfBoundsOnX) normalizedX = bodyOffsetX + body.offsetWidth - menu.offsetWidth;
	if (outOfBoundsOnY) normalizedY = bodyOffsetY + body.offsetHeight - menu.offsetHeight - outOfBoundsCorrectionY;

	return { normalizedX, normalizedY };
};

body.addEventListener("contextmenu", (event) => {
	event.preventDefault();
	if (event.target.isContentEditable) {

		var { clientX: mouseX, clientY: mouseY } = event;
		var { normalizedX, normalizedY } = normalizePozition(mouseX, mouseY, context_menu, 0);

		context_menu.classList.remove("visible");
		selection_menu.classList.remove("visible");

		context_menu.style.top = `${normalizedY}px`;
		context_menu.style.left = `${normalizedX}px`;

		if (event.target.isContentEditable) selectionMenu();

		setTimeout(() => { context_menu.classList.add("visible"); });
	}
	else {
		context_menu.classList.remove("visible");
		selection_menu.classList.remove("visible");
	}
});

function selectionMenu() {
	var { clientX: mouseX, clientY: mouseY } = event;
	var { normalizedX, normalizedY } = normalizePozition(mouseX, mouseY - 50, selection_menu, context_menu.clientHeight + 12);

	selection_menu.classList.remove("visible");

	selection_menu.style.top = `${normalizedY}px`;
	selection_menu.style.left = `${normalizedX}px`;

	setTimeout(() => { selection_menu.classList.add("visible"); });
}

body.addEventListener("click", (e) => {
	context_menu.classList.remove("visible");
	selection_menu.classList.remove("visible");

	if (e.target.nodeName == "A" && e.target.classList.contains("ql-preview")) {
		var href = e.target.href;
		href = href.replace("https://tauri.localhost", "https:/").replace("http://127.0.0.1:1430", "http:/");

		if (href == "http://*%7CUNSUBSCRIBED%7C*") return;

		invoke("open_link", {url: href});
	}
});


// #####################################################################################
// Attachments
var attachments = document.querySelector("attachments");
async function selectFile(insert_attachments) {
	if (insert_attachments) var filters = ["avif", "bmp", "gif", "jfif", "jpeg", "jpg", "png", "svg", "tiff", "webp"];
	else var filters = ["*"];

	var index = quill.getSelection().index;

	var files = await window.__TAURI__.dialog.open({
		multiple: true,
		filters: [{
			name: "Alle Dateien",
			extensions: filters
		}]
	});

	if (files == null) return;

	for (var i = 0; i < files.length; i++) {
		var {src, id} = await createGithubUrl(files[i], "path", insert_attachments);

		if (src == false) return;
		var link_text = src.split("/").pop();

		// show file in attachment list
		var attachment = document.createElement("div");
		attachment.innerHTML = link_text;
		attachment.id = id;

		attachment.setAttribute("onmouseenter", "showTooltip(this, 2, 'Löschen')");
		attachment.addEventListener("click", e => {
			e.target.remove();
			if (tooltip_timeout != undefined) clearTimeout(tooltip_timeout);
			tooltip.removeAttribute("style");
			tooltip_timeout = undefined;

			var links = editor_el.querySelectorAll(`a[href="${src}"]`);
			for (var i = 0; i < links.length; i++) {
				var link = Quill.find(links[i]);
				var link_index = quill.getIndex(link);
				var link_length = quill.getLeaf(link_index)[0].text.length;
				quill.formatText(link_index, link_length, "link", false);

				// deleteGithubUrl(id)
			}
		});

		attachments.appendChild(attachment);

		// show file in newsletter text
		if (insert_attachments) {
			quill.insertEmbed(index, "image", src);
			var new_img = editor_el.querySelector("img:not(.computed)");
			new_img.classList.add("computed");
			new_img.id = id;
		}
		else {
			var showing_text = settings.link_text.replace("${file_name}", link_text)
			quill.insertText(index, showing_text, {link:src});
			quill.setSelection(index, showing_text.length);
		}
	}
}

var enter = document.querySelector("enter");
var enter_input = enter.querySelector("input");
function openEnter(suggestion_name) {
	return new Promise((resolve) => {
		enter.style.display = "block";
		
		enter_input.focus();
		enter_input.value = suggestion_name;
		enter_input.setSelectionRange(0, suggestion_name.lastIndexOf("."));

		document.getElementById("enter_ok").addEventListener("click", (e) => {
			resolve(enter_input.value);
			enter.style.display = "none";
		});
		document.getElementById("enter_cancel").addEventListener("click", (e) => {
			resolve(false);
			enter.style.display = "none";
		});
	});
}

async function createGithubUrl(data, type) {
	// ask for file name
	if (type == "path") {
		var suggestion_name = data.split("\\").pop();
		var temp_path = false;
		var local_path = data;
	}
	else if (type == "data-url") {
		var file_type = data.split(";")[0].split("/")[1];
		var suggestion_name = "Neue Datei." + file_type;
		var temp_path = true;
	}
	else return false;

	var file_name = await openEnter(suggestion_name);
	if (file_name == false) return false;
	file_name = file_name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");

	// get release of campaign or create one if it doesnt exist
	var get_response = await invoke("github_get", {id:active_campaign.toString(), tempPath:temp_path});
	var release_return = JSON.parse(get_response);

	if (release_return.status == "404") {
		var release_data = `{"tag_name":"${active_campaign}","name":"${document.getElementById("subject").value || "New Campaign"}"}`
		var create_response = await invoke("github_create", {data:release_data});
		release_return = JSON.parse(create_response);
	}

	// create temp file from data-url
	if (type == "data-url") {
		var local_path = "com.cmd-golem.infomaniak-newsletter-interface/" + new Date().toISOString().replaceAll(":", ".") + "." + file_type;

		var url_index = data.indexOf(";base64,") + 8;
		var base64 = data.substring(url_index);
		var raw = window.atob(base64);
		var file_array = new Uint8Array(new ArrayBuffer(raw.length));

		for (var i = 0; i < raw.length; i++) file_array[i] = raw.charCodeAt(i);
		await window.__TAURI__.fs.writeBinaryFile(local_path, file_array, { dir: window.__TAURI__.fs.BaseDirectory.Temp });
	}

	var upload_response = await invoke("github_upload_file", {id:release_return.id.toString(), filePath:local_path, tempPath:temp_path, fileName:file_name}) || '{"errors":"An unknown error occured"}';
	console.log(upload_response)
	var file_data = JSON.parse(upload_response);

	if (file_data.browser_download_url != undefined) return {src: file_data.browser_download_url, id: file_data.id};
	else {
		openDialog("backend_error", file_data.message + ": " + JSON.stringify(file_data.errors));
		return false;
	}
}

async function deleteGithubUrl() {
	var response = await invoke("github_get", {id:active_campaign.toString(), tempPath:false});
	var release = JSON.parse(response);

	if (release.status == "404") return;
	else if (release.assets.length == 1) {
		var delete_response = invoke("github_delete", {release:release.id, tag:release.tag_name});
		console.log(delete_response);
	}
	else {
		// handle individual files
	} 
}

// unused uploadAttachment()
async function uploadAttachment(data, type, embedable) {
	// get file from path and size
	if (type == "path") {
		var file_array = await window.__TAURI__.fs.readBinaryFile(data);
		var file_size = file_array.length / 1_048_576;
		var file_type = data.split(".").pop();
		var suggestion_name = data.split("\\").pop();
	}
	else if (type == "data-url") {
		var file_size = Math.round(data.length * 3 / 4);
		var file_type = data.split(";")[0].split("/")[1];
		var suggestion_name = "Neue Datei." + file_type;
	}
	else return false;

	var under_size_limit = true; // file_size + current_size <= max_size;
	
	// ask wheter to embed or upload img
	if (under_size_limit && embedable && settings.secrets[1] == true) var user_action = await openDialog("embed");
	// embed img when upload credentials arent defined 
	if (under_size_limit && embedable && settings.secrets[1] != true) var user_action = "dialog_yes";
	// upload file when campaign size limit is reached or file isnt embedable
	else if ((!under_size_limit || !embedable) && settings.secrets[1] == true) var user_action = "dialog_no";
	else {
		openDialog("no_file_upload_auth");
		return false;
	}
	
	// return embedable data-url
	if (user_action == "dialog_yes") {
		if (type == "data-url") return data;
		else if (type == "path") return URL.createObjectURL(file_array);
	}
	// upload file and return url
	else if (user_action == "dialog_no") {
		// ask for file name
		var file_name = await openEnter(suggestion_name);
		if (file_name == false) return false;

		// get release of campaign or create one if it doesnt exist
		var get_response = await invoke("github_get", {id:active_campaign.toString()});
		var release_return = JSON.parse(get_response);

		if (release_return.status == "404") {
			var release_data = `{"tag_name":"${active_campaign}","name":"${document.getElementById("subject").value || "New Campaign"}"}`
			var create_response = await invoke("github_create", {data:release_data});
			release_return = JSON.parse(create_response);
		}

		// create temp file from data-url
		if (type == "data-url") {
			var local_path = "/com.cmd-golem.infomaniak-newsletter-interface/" + new Date().toISOString();

			var url_index = data.indexOf(";base64,") + 8;
			var base64 = data.substring(url_index);
			var raw = window.atob(base64);
			var file_array = new Uint8Array(new ArrayBuffer(raw.length));

			for (var i = 0; i < raw.length; i++) {
				file_array[i] = raw.charCodeAt(i);
			}

			var write_response = await window.__TAURI__.fs.writeBinaryFile(local_path, file_array, { dir: BaseDirectory.Temp });
		}
		else var local_path = data;

		var upload_response = await invoke("github_upload_file", {id:release_return.id.toString(), filePath:local_path, fileName:file_name});
		var file_data = JSON.parse(upload_response);

		console.log(upload_response);

		if (file_data.browser_download_url != undefined) return file_data.browser_download_url;
		else {
			openDialog("backend_error", JSON.parse(file_data.errors));
			return false;
		}
	}
	else return false;
}
