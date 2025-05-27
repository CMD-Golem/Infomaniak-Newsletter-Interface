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
		if (typeof value === "string" && value.includes(";base64,")) {
			node.setAttribute("id", "no_file");
			node.setAttribute("src", value);
			node.setAttribute("style", "width: 500px;");
			node.setAttribute("class", "computed");
		}
		else if (typeof value === "string") {
			node.setAttribute("src", value);
			node.setAttribute("style", "width: 500px;");
		}
		else {
			// node.setAttribute("id", "");
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
	var clipboard_text = await t.clipboardManager.readText();

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
quill.on("text-change", async () => {
	var new_img = document.getElementById("no_file");
	if (new_img != null) {
		quill.enable(false);
		var src = await uploadFile(new_img.src, "data-url");
		new_img.removeAttribute("id");

		quill.enable(true);

		if (src == false) {
			quill.history.undo();
		}
		else {
			new_img.src = `${settings.public_url}/${src}`;
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
var quill_link_menu = document.querySelector(".ql-tooltip");

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
	var { normalizedX, normalizedY } = normalizePozition(mouseX, mouseY - 50, selection_menu, 0);

	selection_menu.classList.remove("visible");

	selection_menu.style.top = `${normalizedY}px`;
	selection_menu.style.left = `${normalizedX}px`;

	setTimeout(() => { selection_menu.classList.add("visible"); });
}

body.addEventListener("click", (e) => {
	context_menu.classList.remove("visible");
	selection_menu.classList.remove("visible");

	e.preventDefault();

	if (e.target.nodeName == "A" && e.target.classList.contains("ql-preview")) {
		var href = e.target.href;
		href = href.replace("http://tauri.localhost", "http:/").replace("http://127.0.0.1:1430", "http:/");

		if (href == "http://*%7CUNSUBSCRIBED%7C*") return;

		t.opener.openUrl(href);
	}
	else if (e.target.nodeName == "A") {
		if (parseFloat(quill_link_menu.style.left) < 0) quill_link_menu.style.left = "0";
		quill_link_menu.style.top = (parseFloat(quill_link_menu.style.top) + editor_el.scrollTop) + "px";
	} 
});
// link
function openLink() {
	document.getElementsByClassName('ql-link')[0].click();
	var link_tool = document.querySelector(".ql-tooltip.ql-editing[data-mode='link']");
	
	link_tool.style.top = (parseFloat(quill_link_menu.style.top) + editor_el.scrollTop) + "px"
	if (parseFloat(link_tool.style.left) < 0) link_tool.style.left = "0";
}


// #####################################################################################
// Attachments
var attachments = document.querySelector("attachments");

function generateAttachmentHtml(id, src) {
	var path = src.split("/").pop();
	return `<div onmouseenter="attachmentMenu(this, '${id}/${path}')">${path}</div>`;
}

async function selectFile(insert_attachments) {
	if (insert_attachments) var filters = ["avif", "bmp", "gif", "jfif", "jpeg", "jpg", "png", "svg", "tiff", "webp"];
	else var filters = ["*"];

	var files = await t.dialog.open({
		multiple: true,
		filters: [{
			name: text_open_files,
			extensions: filters
		}]
	});

	if (files == null) return;

	for (var i = 0; i < files.length; i++) {
		var src = await uploadFile(files[i], "path");
		insertFile(src, insert_attachments, true);
	}
}

function insertFile(src, insert_attachments, select) {
	if (src == false) return;

	var sel = quill.getSelection();
	if (sel == null) return openDialog("quill_no_selection");
	
	var path = `${settings.public_url}/${src}`;

	// show file in newsletter text
	if (insert_attachments) {
		quill.insertEmbed(sel.index, "image", path);
		var new_img = editor_el.querySelector("img:not(.computed)");
		new_img.classList.add("computed");
	}
	else {
		var showing_text = settings.file_text?.replace("${file_name}", src.split("/").pop()) || src.split("/").pop();
		quill.insertText(sel.index, showing_text, {link:path});
		if (select) quill.setSelection(sel.index, showing_text.length);
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

		document.getElementById("enter_ok").addEventListener("click", () => {
			resolve(enter_input.value);
			enter.style.display = "none";
		});
		document.getElementById("enter_cancel").addEventListener("click", () => {
			resolve(false);
			enter.style.display = "none";
		});
	});
}

async function uploadFile(data, type) {
	// check for webdav credetials
	if (settings.webdav_url == "" || settings.webdav_username == "" || settings.webdav_password == "false" || settings.public_url == "") {
		openDialog("no_file_upload_auth");
		return false;
	}

	var sel = quill.getSelection();
	if (sel == null) {
		openDialog("quill_no_selection");
		return false;
	}

	// check if newsletter already has id
	if (active_campaign == 0) var saving_result = await saveCampaign();
	if (saving_result == false) return false;

	// ask for file name
	if (type == "path") {
		var suggestion_name = data.split("\\").pop();
		var is_temp = false;
		var local_path = data;
	}
	else if (type == "data-url") {
		var file_type = data.split(";")[0].split("/")[1];
		var suggestion_name = text_suggest_name + file_type;
		var is_temp = true;
	}
	else return false;

	
	var file_name = await openEnter(suggestion_name);
	if (file_name == false) return false;
	file_name = file_name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
	quill.setSelection(sel.index);

	
	// check if file already exists
	var online_path = `${active_campaign}/${file_name}`;
	
	if (await invoke("get", {dir:online_path}) != "Not Found") {
		var user_action = await openDialog("overwrite_attachment");
		if (user_action == "dialog_cancel") return false;
	}

	// create temp file from data-url
	if (is_temp) {
		if (!(await t.fs.exists("com.cmd-golem.infomaniak-newsletter-interface", { baseDir: t.fs.BaseDirectory.Temp}))) {
			await t.fs.mkdir("com.cmd-golem.infomaniak-newsletter-interface", { baseDir: t.fs.BaseDirectory.Temp });
		}
		var local_path = "com.cmd-golem.infomaniak-newsletter-interface/" + file_name;

		var url_index = data.indexOf(";base64,") + 8;
		var base64 = data.substring(url_index);
		var raw = window.atob(base64);
		var file_array = new Uint8Array(new ArrayBuffer(raw.length));

		for (var i = 0; i < raw.length; i++) file_array[i] = raw.charCodeAt(i);
		await t.fs.writeFile(local_path, file_array, { baseDir: t.fs.BaseDirectory.Temp });
	}

	// upload file
	var upload_response = await invoke("post", {localPath:local_path, onlinePath:online_path, isTemp:is_temp});
	console.log("Response from uploading attachment: " + upload_response);

	// insert pill, only if file is not overwritten
	attachments.innerHTML += generateAttachmentHtml(active_campaign, online_path);

	return online_path;
}

async function deleteAttachment(el, path) {
	var user_action = await openDialog("delete_attachment");
	if (user_action == "dialog_cancel") return false;

	var lining_elements = editor_el.querySelectorAll(`img[src="${settings.public_url}/${path}"], a[href="${settings.public_url}/${path}"]`);
	for (var i = 0; i < lining_elements.length; i++) lining_elements[i].remove();

	var response = await invoke("delete", {path:path});
	console.log("Response from deleting attachment: " + response);

	el.remove();
}

// hover over attachment pil for menu
var attachment_menu = document.querySelector("attachment");
var selected_attachment = [null, false];
var attachment_menu_timeout;

function attachmentMenu(el, src) {
	var el_pos = el.getBoundingClientRect();
	attachment_menu.setAttribute("style", `transform: scale(1); top: ${el_pos.top + el_pos.height +5}px; left: ${el_pos.left + el_pos.width /2}px; transform: translate(-50%, 0);`);
	
	var menu_pos = attachment_menu.getBoundingClientRect();
	attachment_menu.firstElementChild.setAttribute("style", `top: -${el_pos.height +5}px; left: ${(menu_pos.width - el_pos.width)/2}px; width: ${el_pos.width}px; height: ${el_pos.height +5}px;`);
	
	selected_attachment = [el, src];
	attachment_menu.addEventListener("mouseleave", closeAttachmentMenu, {once: true});
}

function closeAttachmentMenu() {
	attachment_menu.removeAttribute("style");
	attachment_menu.firstElementChild.removeAttribute("style");
	selected_attachment = [null, false];
}