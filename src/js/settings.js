const settings_array = ["infomaniak_domain", "public_url", "webdav_url", "webdav_username", "sender_name", "sender_email", "lang", "unsubscribe", "file_text", "copy_text"];
const toolbar_options = ['bold', 'italic', 'underline', 'strike', 'link', { 'align': [] }, { 'color': [] }]


var el_infomaniak_secret = document.getElementById("infomaniak_secret");
var el_webdav_password = document.getElementById("webdav_password");

var quill = new Quill("#editor", 
	{
		modules: {
			toolbar: toolbar_options,
		},
		theme: "snow",
	}
);

// settings panel
async function openSettings(json, disable_cancel) {
	document.querySelector("settings").style.display = "block";

	if (json == undefined) {
		var response = await invoke("get_config");
		json = JSON.parse(response);
	}

	if (json.status == "error") return openDialog("backend_error", json.error);
	if (disable_cancel) document.getElementById("settings_cancel").disabled = true;

	// show current settings on page
	for (var i = 0; i < settings_array.length; i++) document.getElementById(settings_array[i]).value = json[settings_array[i]];
}

async function saveSettings(action) {
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

	document.getElementById("settings_cancel").disabled = false;
	if (action != "apply") closeSettings(action);
	if (action == "cancel") return false;

	// store changes before
	if (unsaved_campaign) {
		var user_action = await openDialog("unsaved_changes");

		if (user_action == "dialog_yes") await saveCampaign();
		else if (user_action == "dialog_no") unsaved_campaign = false;
		else if (user_action == "dialog_cancel") return false;
	}
	active_campaign = null;

	// save settings
	var new_settings = [];

	for (var i = 0; i < settings_array.length; i++) validateSettings(settings_array[i], new_settings);

	if (el_infomaniak_secret.value != "") new_settings.push({property:"infomaniak_secret", value:el_infomaniak_secret.value});
	if (el_webdav_password.value != "") new_settings.push({property:"webdav_password", value:el_webdav_password.value});

	if (new_settings.length != 0) {
		var response = await invoke("change_config", {data:JSON.stringify(new_settings)});
		if (response != "success") {
			console.log("error in settings")
			return openDialog("backend_error", response);
		}
	}

	// reload settings
	var response = await invoke("get_config");
	json = JSON.parse(response);

	if (json.status == "error") return openDialog("backend_error", json.error);
	settings = json;
	
	// reload backend
	getCampaigns(true, true);
	getCredits();
	getMailinglists();
}

function validateSettings(property, new_settings) {
	var value = document.getElementById(property).value;

	if (settings[property] != value) {
		settings[property] = value;
		new_settings.push({property:property, value:value});
	}
}

function closeSettings(action) {
	if (action == "cancel" && document.getElementById("settings_cancel").getAttribute("disabled") == "") return

	document.querySelector("settings").style.display = "none";
	el_infomaniak_secret.style.display = "none";
	el_webdav_password.style.display = "none";

	el_infomaniak_secret.previousElementSibling.style.display = "block";
	el_webdav_password.previousElementSibling.style.display = "block";

	el_infomaniak_secret.value = "";
	el_webdav_password.value = "";
}