const toolbar_options = ['bold', 'italic', 'underline', 'strike', 'link', { 'align': [] }, { 'color': [] }]

var el_infomaniak_secret = document.getElementById("infomaniak_secret");
var el_webdav_password = document.getElementById("webdav_password");
var settings = undefined;

var quill = new Quill("#editor", 
	{
		modules: {
			toolbar: toolbar_options,
		},
		theme: "snow",
	}
);

// settings panel
async function openSettings() {
	var json = await invoke("get_config");
	settings = JSON.parse(json);

	if (settings.status == "error") return openDialog("backend_error", settings.error);

	quill.clipboard.dangerouslyPasteHTML(settings.signature);

	delete settings.infomaniak_secret;
	delete settings.webdav_password;
	delete settings.test_email;
	delete settings.signature;

	for (var [key, value] of Object.entries(settings)) document.getElementById(key).value = value;
}

openSettings();

async function saveSettings() {
	// check if settings are defined
	if (
		document.getElementById("sender_name").value == "" ||
		document.getElementById("sender_email").value == "" ||
		document.getElementById("infomaniak_domain").value == "" ||
		(el_infomaniak_secret.value == "" && settings.infomaniak_secret == "false")
	) {
		openDialog("undefined_settings");
		return;
	}

	// save settings
	var new_settings = [];

	for (var key of Object.keys(settings)) validateSettings(key, new_settings);;

	if (el_infomaniak_secret.value != "") {
		new_settings.push({property:"infomaniak_secret", value:el_infomaniak_secret.value});
		el_infomaniak_secret.style.display = "none";
		el_infomaniak_secret.previousElementSibling.style.display = "block";
		el_infomaniak_secret.value = "";
	}
	if (el_webdav_password.value != "") {
		new_settings.push({property:"webdav_password", value:el_webdav_password.value});
		el_webdav_password.style.display = "none";
		el_webdav_password.previousElementSibling.style.display = "block";
		el_webdav_password.value = "";
	}

	console.log(new_settings)

	if (new_settings.length != 0) {
		var response = await invoke("change_config", {data:JSON.stringify(new_settings)});
		if (response != "success") {
			console.log("error in settings")
			return openDialog("backend_error", response);
		}

		await t.event.emit('changed_settings');
	}
}

function validateSettings(property, new_settings) {
	console.log(property)
	var value = document.getElementById(property).value;

	if (settings[property] != value) {
		settings[property] = value;
		new_settings.push({property:property, value:value});
	}
}

function changeTab(el, is_profile, id) {
	document.querySelector(".selected")?.classList.remove("selected");
	el.classList.add("selected");

	if (is_profile) {
		document.querySelector("profile").style.display = "block";
		document.querySelector("general").style.display = "none";
	}
	else {
		document.querySelector("profile").style.display = "none";
		document.querySelector("general").style.display = "block";
	}

}