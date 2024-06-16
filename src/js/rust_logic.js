var unsaved_campaign = false;
var active_campaign = null;
var defined_secrets;
var settings = {test_email:undefined};


// initalize and load everything after document loaded
var campaign_list = document.querySelector("list");
var el_test_email = document.getElementById("test_email");
var newsletter_group = document.getElementById("newsletter_group");
var subject = document.getElementById("subject");
var el_infomaniak_secret = document.getElementById("infomaniak_secret");
var el_github_secret = document.getElementById("github_secret");
var el_ftp_user = document.getElementById("ftp_user");
var el_ftp_password = document.getElementById("ftp_password");

quill.on('text-change', () => { unsaved_campaign = true });


window.onload = async () => {
	quill.focus();

	if (invoke == undefined) return;

	var response = await invoke("init_config", {init:true});
	var json = JSON.parse(response);

	if (json.result != "success") {
		openDialog("backend_error", json.error);
	}
	else if (
		json.infomaniak_secret == true &&
		json.newsletter.email_from_name != "" &&
		json.newsletter.lang != "" &&
		json.newsletter.email_from_addr != "" &&
		json.newsletter.unsubscribe != ""
	) {
		settings = json.newsletter;
		el_test_email.value = settings.test_email ?? "";
		settings.secrets = [json.infomaniak_secret, json.github_secret, json.ftp_user, json.ftp_password];

		getMailinglists();
		initEditor();
		getCampaigns(true);
		getCredits();
	}
	else {
		openSettings(json, true);
	}
}

if (invoke != undefined) {
	window.__TAURI__.event.listen("changed_mailinglists", async (e) => {
		var set_value = newsletter_group.value;
		await getMailinglists();
		newsletter_group.value = set_value;
	});
}

async function getCredits() {
	var response = await invoke("get_credits");
	var json = JSON.parse(response);
	if (json.result == "success") document.getElementById("credits").innerHTML = json.data.credits;
	else openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
}

function initEditor() {
	var unsubscribe = settings.unsubscribe.replaceAll("\\n", "\n");

	quill.insertText(0, unsubscribe, {
		link: "*|UNSUBSCRIBED|*",
		size: "9px"
	});

	unsaved_campaign = false;
}

// settings panel
async function openSettings(json, disable_cancel) {
	document.querySelector("settings").style.display = "block";

	if (json == undefined) {
		var response = await invoke("init_config", {init:false});
		json = JSON.parse(response);

		if (json.result == "error") {
			openDialog("backend_error", json.error);
			return;
		}
	}

	if (disable_cancel) document.getElementById("settings_cancel").disabled = true;

	settings.secrets = [json.infomaniak_secret, json.github_secret, json.ftp_user, json.ftp_password];

	// show current settings on page
	document.getElementById("email_from_name").value = json.newsletter.email_from_name;
	document.getElementById("lang").value = json.newsletter.lang;
	document.getElementById("email_from_addr").value = json.newsletter.email_from_addr;
	document.getElementById("unsubscribe").value = json.newsletter.unsubscribe;
	document.getElementById("github_path").value = json.newsletter.github_path;
}

async function saveSettings(action) {
	var email_from_name = document.getElementById("email_from_name").value;
	var lang = document.getElementById("lang").value;
	var email_from_addr = document.getElementById("email_from_addr").value;
	var unsubscribe = document.getElementById("unsubscribe").value;
	var github_path = document.getElementById("github_path").value;

	// check if settings are defined
	if (
		email_from_name == "" ||
		lang == "" ||
		email_from_addr == "" ||
		unsubscribe == "" ||
		(el_infomaniak_secret.value == "" && !settings.secrets[0])
	) {
		openDialog("undefined_settings");
		return;
	}


	// save settings
	else if (action != "cancel") {
		var new_settings = [], setting;

		(setting = validateSettings("email_from_name", email_from_name)) != undefined && new_settings.push(setting);
		(setting = validateSettings("lang", lang)) != undefined && new_settings.push(setting);
		(setting = validateSettings("email_from_addr", email_from_addr)) != undefined && new_settings.push(setting);
		(setting = validateSettings("unsubscribe", unsubscribe)) != undefined && new_settings.push(setting);
		(setting = validateSettings("github_path", github_path)) != undefined && new_settings.push(setting);

		if (el_infomaniak_secret.value != "") new_settings.push({property:"infomaniak_secret", value:el_infomaniak_secret.value});
		if (el_github_secret.value != "") new_settings.push({property:"github_secret", value:el_github_secret.value});
		if (el_ftp_user.value != "") new_settings.push({property:"ftp_user", value:el_ftp_user.value});
		if (el_ftp_password.value != "") new_settings.push({property:"ftp_password", value:el_ftp_password.value});

		if (new_settings.length != 0) var had_error = await invoke("change_config", {data:JSON.stringify(new_settings)});

		if (had_error != "false") {
			openDialog("backend_error", had_error);
			return;
		}
	}

	if (action != "apply") closeSettings(action);
	document.getElementById("settings_cancel").disabled = false;
	// reload backend if infomaniak_secret changed
	if (el_infomaniak_secret.value != "") {
		getCampaigns(true);
		getCredits();
		getMailinglists();
	}
}

function closeSettings(action) {
	if (action == "cancel" && document.getElementById("settings_cancel").getAttribute("disabled") == "") return

	document.querySelector("settings").style.display = "none";
	el_infomaniak_secret.style.display = "none";
	el_github_secret.style.display = "none";
	el_ftp_user.parentElement.style.display = "none";

	el_infomaniak_secret.previousElementSibling.style.display = "block";
	el_github_secret.previousElementSibling.style.display = "block";
	el_ftp_user.parentElement.previousElementSibling.style.display = "block";

	el_infomaniak_secret.value = "";
	el_github_secret.value = "";
	el_ftp_user.value = "";
	el_ftp_password.value = "";
}

function validateSettings(property, value) {
	if (settings[property] != value && value != "") {
		settings[property] = value;
		return {property:property, value:value};
	}
	else return undefined;
}

// #####################################################################################
function createCampaignHtml(campaign_object) {
	var html = `
	<listitem id="${campaign_object.id}" onclick="getCampaign(${campaign_object.id})">
		<p>${campaign_object.subject}</p>
		<button onclick="duplicateCampaign(${campaign_object.id})" onmouseenter="showTooltip(this, 2, 'Newsletter duplizieren')">
			<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5.503 4.627 5.5 6.75v10.504a3.25 3.25 0 0 0 3.25 3.25h8.616a2.251 2.251 0 0 1-2.122 1.5H8.75A4.75 4.75 0 0 1 4 17.254V6.75c0-.98.627-1.815 1.503-2.123ZM17.75 2A2.25 2.25 0 0 1 20 4.25v13a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8.75 2h9Z"/></svg>
		</button>
		<button onclick="deleteCampaign(${campaign_object.id}, true)" onmouseenter="showTooltip(this, 2, 'Newsletter löschen')">
			<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"/></svg>
		</button>
	</listitem>`

	return html;
}

// load all campaings and show first campaign in editor
async function getCampaigns(first_load) {
	var response = await invoke("get_campaigns");
	var json = JSON.parse(response);

	if (json.result != "success") {
		openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
		return false;
	}

	var html = "";
	var first_id = null;

	for (var i = json.data.data.length - 1; i >= 0; i--) {
		var campaign = json.data.data[i];

		if (first_id == null) { first_id = campaign.id; }
		html += createCampaignHtml(campaign);
	}

	if (first_load && json.data.data.length != 0) {
		getCampaign(first_id);
		active_campaign = first_id;
	}
	campaign_list.innerHTML = html;
}

// get specific campaign and show it in editor
async function getCampaign(id) {
	if (unsaved_campaign) {
		var user_action = await openDialog("unsaved_changes");

		if (user_action == "dialog_yes") await saveCampaign();
		else if (user_action == "dialog_no") unsaved_campaign = false;
		else if (user_action == "dialog_cancel") return false;
	}
	else if (active_campaign == id) return false;
	
	var response = await invoke("get_campaign", {id:id});
	var json = JSON.parse(response);

	if (json.result == "success") {
		quill.clipboard.dangerouslyPasteHTML(json.data.content)
		subject.value = json.data.subject;
		unsaved_campaign = false;

		if (json.data.mailinglists[0] == undefined) {
			newsletter_group.value = "";
		}
		else {
			newsletter_group.value = json.data.mailinglists[0].id;
		}

		active_campaign = id;
	}
	else openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
}

async function saveCampaign(wants_sending) {
	// check for active campaign
	if (active_campaign == null) {
		openDialog("no_selection");
		return false;
	}

	// check if campaign was already sent
	var campaign_status = 2;

	if (active_campaign != 0) {
		var response = await invoke("get_campaign", {id:active_campaign});
		var json = JSON.parse(response);

		if (json.result == "success") campaign_status = json.data.status.id; // 1 Sent, 2 Draft, 3 Programmed, 4 Sending in progress
		else {
			openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
			return false;
		}
	}

	if (wants_sending && campaign_status >= 3) {
		openDialog("already_sent");
		return false;
	}

	// check if subject and newsletter_group is filled in
	else if (newsletter_group.value == "") {
		openDialog("no_selected_mailinglist");
		return false;
	}
	else if (subject.value == "") {
		openDialog("no_subject");
		return false;
	}

	// create data string if a campaign is active
	var html_content = quill.getSemanticHTML();
	if (!html_content.includes('<a href="*|UNSUBSCRIBED|*"')) html_content += '<template><a href="*|UNSUBSCRIBED|*" target="_blank"></a></template>';
	var content = `<style>p {margin: 0;} * {font-size: ${standard_text_size}; font-family: ${standard_font}}</style>` + html_content.replaceAll('"', '\\"').replaceAll("<p></p>", "<br>");

	var email_from_addr = settings.email_from_addr.split("@");

	var data = `{
		"subject":"${subject.value}",
		"email_from_name":"${settings.email_from_name}",
		"lang":"${settings.lang}",
		"email_from_addr":"${email_from_addr[0]}",
		"content":"${content}",
		"mailinglistIds":[${newsletter_group.value}]
	}`;

	data = data.replaceAll("\n", "").replaceAll("\t", "");

	// create new campaign if it doesnt exist or was already sent
	if (active_campaign == 0 || campaign_status == 1) {
		var response = await invoke("create_campaign", {data:data});
		var json = JSON.parse(response);

		if (json.result == "success") {
			if (campaign_status == 1) deleteCampaign(active_campaign, false); // delete sent campaign
			active_campaign = json.data.id;
			unsaved_campaign = false;

			var current_html = campaign_list.innerHTML;
			var html = createCampaignHtml(json.data);
			campaign_list.innerHTML = html + current_html;

			return true;
		}
		else {
			openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
			return false;
		}
	}
	// prevent saving of newsletter which is currently being sent (id 3 & 4)
	else if (campaign_status != 2) openDialog("newsletter_programmed");
	// update existing campaign draft
	else {
		var response = await invoke("update_campaign", {id:active_campaign, data:data});
		var json = JSON.parse(response);

		if (json.result == "success") {
			document.getElementById(json.data.id).firstElementChild.innerHTML = json.data.subject;
			unsaved_campaign = false;
			return true;
		}
		else {
			openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
			return false;
		}
	}
}

// send or test campaign
async function sendCampaign(is_test) {
	var should_continue = await saveCampaign(true);
	if (!should_continue) return false;

	// send test mail
	if (is_test) {
		if (el_test_email.value == "") {
			openDialog("no_test_mail");
			return false;
		}

		var response = await invoke("test_campaign", {id:active_campaign, data:`{"email":"${el_test_email.value}"}`});
		var json = JSON.parse(response);

		if (json.result != "success") {
			openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
			return;
		}

		openDialog("sent_test_mail");

		if (el_test_email.value != settings.test_email) {
			settings.test_email = el_test_email.value;
			var had_error = await invoke("change_config", {data:JSON.stringify([{property:"test_email", value:el_test_email.value}])});
			if (had_error != "false") openDialog("backend_error", had_error);
		}
	}
	else {
		// send campaign to mailinglist
		var response = await invoke("send_campaign", {id:active_campaign});
		var json = JSON.parse(response);

		if (json.result == "success") {
			var date = json.data.scheduled_at.date.replace(" ", "T").slice(0, -3) + "+02:00";
			getCampaigns();
			openDialog("sent_campaign", date.slice(11,16));
			setTimeout(getCredits, 500);
		}
		else openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
	}
}


// Prepare to create new campaign
async function startCampaign() {
	if (unsaved_campaign) {
		var user_action = await openDialog("unsaved_changes");

		if (user_action == "dialog_yes") await saveCampaign();
		else if (user_action == "dialog_no") unsaved_campaign = false;
		else if (user_action == "dialog_cancel") return false;
	}

	editor_el.firstChild.innerHTML = "";
	subject.value = "";
	newsletter_group.value = "";
	initEditor();

	active_campaign = 0;
}

async function deleteCampaign(id, user) {
	// if needed ask user again
	if (user) {
		event.stopPropagation(); 
		var user_action = await openDialog("delete_campaign");
	}
	else var user_action = "dialog_yes";

	// prevent deleting of newsletter which is currently being sent (id 3 & 4)
	var response = await invoke("get_campaign", {id:id});
	var json = JSON.parse(response);

	if (json.result == "success" && json.data.status.id >= 3) {
		openDialog("delete_forbidden");
		return false;
	}
	else if (json.result != "success") {
		openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
		return false;
	}

	// delete campaign and select new from top
	if (user_action == "dialog_yes") {
		var response = await invoke("delete_campaign", {id:id});
		var json = JSON.parse(response);

		if (json.result == "success") {
			document.getElementById(id).remove();
			if (user) getCampaign(parseInt(campaign_list.firstElementChild.id));
		}
		else openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
	}
}

async function duplicateCampaign(id) {
	event.stopPropagation();
	if (unsaved_campaign) {
		var user_action = await openDialog("unsaved_changes");

		if (user_action == "dialog_yes") await saveCampaign();
		else if (user_action == "dialog_no") unsaved_campaign = false;
		else if (user_action == "dialog_cancel") return false;
	}

	await getCampaign(id);
	active_campaign = 0;
	subject.value = subject.value + " - Kopie";
	saveCampaign();
}


// #####################################################################################
// load all mailinglist and add them to selection
async function getMailinglists() {
	var response = await invoke("get_mailinglists");
	var json = JSON.parse(response);

	if (json.result == "success") {
		var html = "<option style='display: none;' value='' selected></option>";
		
		for (var i = 0; i < json.data.data.length; i++) {
			var mailinglist = json.data.data[i];
			html += `<option value="${mailinglist.id}">${mailinglist.name}</option>`
		}
		newsletter_group.innerHTML = html;
	}
	else openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
}

function openMailinglists() {
	const webview = new window.__TAURI__.window.WebviewWindow("mailinglists", {
		"title": "Manage Mailingslists",
		"url": "mailinglists.html",
		"width": 680,
		"height": 380,
		"minWidth": 600,
		"minHeight": 280,
		"maximizable": false,
		"minimizable": false,
		"skipTaskbar": true
	});

	webview.once('tauri://error', function (e) {
		if (e.payload == "a window with label `mailinglists` already exists") {
			webview.setFocus();
		}
	});
}