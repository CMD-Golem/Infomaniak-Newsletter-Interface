// https://github.com/soccerloway/quill-better-table

// add custom text sizes and fonts
var Size = Quill.import('attributors/style/size');
Size.whitelist = ["8px", "9px", "10px", "11px", "12px", "13px", "14px", "15px", "16px", "17px", "18px", "19px", "20px", "21px", "22px", "23px", "24px", "25px", "26px", "27px", "28px", "29px", "30px"];
Quill.register(Size, true);

var Font = Quill.import('formats/font');
Font.whitelist = ['arial', 'calibri', "times"];
Quill.register(Font, true);

// register editor
var quill = new Quill('#editor', 
	{
		modules: {
			toolbar: false,
		},
		theme: 'snow',

	}
);

var standard_text_size = "14px";
var size_selection = document.getElementById("size_selection");
size_selection.value = standard_text_size;

document.querySelector(":root").style.setProperty("--font_size", standard_text_size);
document.querySelector(":root").style.setProperty("--font", "arial");
quill.focus();

quill.insertText(0, 'Ich heisse Max Mustermann und wohne in der Schweiz');


// function for toggle buttons
function quillFormat(format, style) {
	var format_object = quill.getFormat();

	if (style == undefined) {
		style = true;
	}

	if (format in format_object) {
		var current_style = format_object[format];
	}
	if (current_style == style) {
		quill.format(format, false);
	}
	else {
		quill.format(format, style);
	}
}

// function for indent
function quillIndent(action) {
	var format_object = quill.getFormat();
	if ("indent" in format_object) {
		var current_indent = format_object.indent;
	}
	else {
		current_indent = 0;
	}

	if (action == "increase") {
		new_indent = current_indent +1;
	}
	else if (current_indent != 0) {
		new_indent = current_indent -1;
	}

	quill.format("indent", new_indent);
}

// function for in/decrease size
function quillSize(action) {
	var format_object = quill.getFormat();
	if ("size" in format_object) {
		var current_px = format_object.size;
	}
	else {
		current_px = standard_text_size;
	}

	var current_size = parseInt(current_px.slice(0, -2))

	if (action == "increase" && current_size != 30) {
		new_size = current_size +1;
	}
	else if (action == "decrease" && current_size != 8) {
		new_size = current_size -1;
	}

	quill.format("size", new_size + "px");
	size_selection.value = new_size + "px";
}

// remove format
function removeFormat() {
	var range = quill.getSelection();
	if (range) {
		if (range.length > 0) {
			quill.removeFormat(range.index, range.length);
		}
	}
}

// open color selection box
var picker = document.getElementsByTagName("picker")[0];

function quillColorSelection(id) {
	var pos = document.getElementById(id).getBoundingClientRect();
	picker.style.top = pos.top + 30 + "px";
	picker.style.left = pos.left + "px";

	picker.setAttribute("data-id", id);

	picker.style.display = "block";
	document.getElementsByTagName("editor")[0].addEventListener("mousedown", hideColorSelection);
}

var colors = picker.getElementsByTagName("td");
for (var i = 0; i < colors.length; i++) {
	colors[i].addEventListener("click", quillSetColor);
}

function quillSetColor(color) {
	var color = color.target.style.backgroundColor;
	quill.format("color", color);

	document.getElementById(picker.getAttribute("data-id")).firstElementChild.firstElementChild.setAttribute("fill", color);

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
		if (range.length > 0) {
			quill.deleteText(range.index, range.length);
		}

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
quill.on('selection-change', () => {
	var format_object = quill.getFormat();
	if ("size" in format_object) {
		size_selection.value = format_object.size;
	}
	else {
		size_selection.value = standard_text_size;
	}
	if ("font" in format_object) {
		font_selection.value = format_object.font;
	}
	else {
		font_selection.value = "arial";
	}

	if (selected_formats != false) {
		var formats = Object.keys(selected_formats);
		for (var i = 0; i < formats.length; i++) {
			quill.format(formats[i], selected_formats[formats[i]]);
		}
		formatPainterEnd();
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

document.addEventListener("keydown", e => {
	if (e.key) {
		formatPainterEnd()
	}
});