// https://github.com/soccerloway/quill-better-table optional
// https://amourspirit.github.io/Typo.js/spell.html optional
// https://github.com/scrapooo/quill-resize-module in use

// add custom text sizes and fonts
var Size = Quill.import('attributors/style/size');
Size.whitelist = ["8px", "9px", "10px", "11px", "12px", "13px", "14px", "15px", "16px", "17px", "18px", "19px", "20px", "21px", "22px", "23px", "24px", "25px", "26px", "27px", "28px", "29px", "30px"];
Quill.register(Size, true);

var Font = Quill.import('formats/font');
Font.whitelist = ['arial', 'calibri', "times"];
Quill.register(Font, true);


Quill.register("modules/resize", window.QuillResizeModule);

// register editor
var quill = new Quill('#editor', 
	{
		modules: {
			toolbar: true,
			resize: {
				locale: {
				  center: "center",
				}
			}
		},
		theme: 'snow',
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
quill.on('selection-change', (e) => {
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

		invoke('open_link', {url: href});
	}
});