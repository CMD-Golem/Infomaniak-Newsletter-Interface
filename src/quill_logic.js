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

quill.focus();


quill.insertText(0, 'Ich heisse Fabian Kaufmann und wohne in Landquart', "size", standard_text_size);


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

// change size and font dropdowns dynamically
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
});

// open color selection box
var picker = document.getElementsByTagName("picker")[0];

function quillColorSelection(id) {
	var pos = document.getElementById(id).getBoundingClientRect();
	picker.style.top = pos.top + 30 + "px";
	picker.style.left = pos.left + "px";

	picker.style.display = "block";
}

var colors = picker.getElementsByTagName("td");
for (var i = 0; i < colors.length; i++) {
	colors[i].addEventListener("click", quillSetColor);
}

function quillSetColor(color) {
	quill.format("color", color.target.style.backgroundColor);
	picker.style.display = "none";
}