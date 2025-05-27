var unsaved_campaign = false;
var active_campaign = null;
var active_tab = "show_draft";
var settings = undefined;
var unlisten;
const settings_array = ["infomaniak_domain", "public_url", "webdav_url", "webdav_username", "sender_name", "sender_email", "lang", "unsubscribe", "file_text"];


// initalize and load everything after document loaded
var campaign_list = document.querySelector("list");
var el_test_email = document.getElementById("test_email");
var newsletter_group = document.getElementById("newsletter_group");
var subject = document.getElementById("subject");
var el_infomaniak_secret = document.getElementById("infomaniak_secret");
var el_webdav_password = document.getElementById("webdav_password");

quill.on('text-change', () => { unsaved_campaign = true });

window.onload = async () => {
	quill.focus();

	if (invoke == undefined) return;

	var response = await invoke("get_config");
	json = JSON.parse(response);

	settings = json;
	el_test_email.value = settings.test_email;

	if (
		json.infomaniak_secret == "true" &&
		json.sender_name != "" &&
		json.sender_email != ""
	) {
		getMailinglists();
		initEditor();
		getCampaigns(true, true);
		getCredits();
	}
	else {
		openSettings(json, true);
	}

	t.event.listen("changed_mailinglists", async () => {
		var set_value = newsletter_group.value;
		await getMailinglists();
		newsletter_group.value = set_value;
	});

	unlisten = await t.window.getCurrentWindow().onCloseRequested(async (event) => {
		if (unsaved_campaign) {
			var user_action = await openDialog("unsaved_changes");
	
			if (user_action == "dialog_yes") await saveCampaign();
			else if (user_action == "dialog_cancel") event.preventDefault();
		}
	});
}

async function getCredits() {
	var response = await invoke("get_credits");

	document.getElementById("credits").innerHTML = response;
}

function changeTab(tab) {
	if (tab == "show_draft") getCampaigns(true, false);
	else getCampaigns(false, false);

	document.querySelector(".active_tab").classList.remove("active_tab");
	document.getElementById(tab).classList.add("active_tab");
}

function initEditor() {
	var unsubscribe = settings.unsubscribe.replaceAll("\\n", "\n");
	editor_el.firstChild.innerHTML = "";
	subject.value = "";
	newsletter_group.value = "";
	attachments.innerHTML = "";
	active_campaign = 0;

	if (unsubscribe != "") {
		quill.insertText(0, unsubscribe, {
			link: "*|UNSUBSCRIBED|*",
			size: "9px"
		});
	}

	unsaved_campaign = false;
}

// settings panel
async function openSettings(json, disable_cancel) {
	document.querySelector("settings").style.display = "block";

	if (json == undefined) {
		var response = await invoke("get_config");
		json = JSON.parse(response);
	}

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
			openDialog("backend_error", response);
			return;
		}
	}
	
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

// #####################################################################################
function createCampaignHtml(campaign_object) {
	for (var i = 0; i < campaign_states.length; i++) {
		if (campaign_states[i].status == campaign_object.status) {
			var status = campaign_states[i];
		}
	}

	if ((campaign_object.status == "scheduled" || campaign_object.status == "sent") && campaign_object.started_at != null) {
		var now = new Date();
		var date = new Date(campaign_object.started_at * 1000);

		if (now.toDateString() == date.toDateString()) {
			var time = date.toLocaleTimeString();
		}
		else {
			var time = date.toLocaleString();
		}

		var status_description = status.description + time
	}
	else var status_description = status.description

	var html = `
	<listitem id="${campaign_object.id}" onclick="getCampaign(${campaign_object.id})">
		<svg width="24" height="24" viewBox="0 0 24 24" onmouseenter="showTooltip(this, 1, '${status_description}')" class="standalone">${status.icon}</svg>
		<p>${campaign_object.subject}</p>
		<button onclick="duplicateCampaign(${campaign_object.id})" onmouseenter="showTooltip(this, 2, '${text_duplicate}')">
			<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5.503 4.627 5.5 6.75v10.504a3.25 3.25 0 0 0 3.25 3.25h8.616a2.251 2.251 0 0 1-2.122 1.5H8.75A4.75 4.75 0 0 1 4 17.254V6.75c0-.98.627-1.815 1.503-2.123ZM17.75 2A2.25 2.25 0 0 1 20 4.25v13a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8.75 2h9Z"/></svg>
		</button>
		<button onclick="deleteCampaign(${campaign_object.id})" onmouseenter="showTooltip(this, 2, '${text_delete}')">
			<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"/></svg>
		</button>
	</listitem>`

	return html;
}

// load all campaings and show first campaign in editor
async function getCampaigns(show_drafts, select_first_campaign) {
	var response = await invoke("get_campaigns");
	var json = JSON.parse(response);

	if (json.result != "success") {
		openDialog("backend_error", JSON.stringify(json.error));
		return false;
	}

	if (show_drafts || (show_drafts == undefined && active_tab == "show_draft")) var remove_status = "sent";
	else var remove_status = "draft";

	var html = "";
	var first_id = undefined;
	for (var i = json.data.length - 1; i >= 0; i--) {
		if (json.data[i].status != remove_status) {
			html += createCampaignHtml(json.data[i]);
			if (first_id == undefined) first_id = json.data[json.data.length - 1].id;
		}
	}
	campaign_list.innerHTML = html;

	if (select_first_campaign && json.data.length != 0) {
		await getCampaign(first_id);
	}

	return json;
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

	var content_res = await invoke("get_campaign_content", {id:id});
	var json_res = JSON.parse(content_res);

	if (json.result == "success" && json_res.result == "success") {
		quill.clipboard.dangerouslyPasteHTML(json_res.data.content)
		subject.value = json.data.subject;
		unsaved_campaign = false;
		active_campaign = id;

		if (json.data.recipients.groups.include.length == 0) newsletter_group.value = "";
		else newsletter_group.value = json.data.recipients.groups.include[0].id;

		document.querySelector(".selected")?.classList.remove("selected");
		document.getElementById(id).classList.add("selected");
	}
	else if (json.result != "success") openDialog("backend_error", JSON.stringify(json.error));
	else openDialog("backend_error", JSON.stringify(json_res.error));

	// show attachments
	var html = "";

	if (settings.webdav_url != "" && settings.webdav_username != "" && settings.webdav_password != "false" && settings.public_url != "") {
		var xml = document.createElement("div");
		xml.innerHTML = await invoke("get", {dir:id.toString()});

		if (xml.getElementsByTagName("D:status")[0]?.innerHTML == "HTTP/1.1 200 OK") {
			var files = xml.getElementsByTagName("D:href");

			for (var i = 1; i < files.length; i++) {
				html += generateAttachmentHtml(id, files[i].innerHTML);
			}
		}
	}
	
	attachments.innerHTML = html;
}

async function saveCampaign() {
	// check for active campaign
	if (active_campaign == null) {
		openDialog("no_campaign_selected");
		return false;
	}

	// check input fields
	if (newsletter_group.value == "" || subject.value == "") {
		openDialog("no_campaign_metadata");
		return false;
	}

	// check if campaign was already sent
	if (active_campaign != 0) {
		var response = await invoke("get_campaign", {id:active_campaign});
		var json = JSON.parse(response);

		if (json.result == "success") var campaign_status = json.data.status;
		else {
			openDialog("backend_error", JSON.stringify(json.error));
			return false;
		}
	}

	// compute images
	var img_el = editor_el.querySelectorAll("img");
	for (var i = 0; i < img_el.length; i++) {
		var el = img_el[i];
		el.width = parseFloat(el.style.width).toFixed();
		el.height = parseFloat(el.style.height).toFixed();
	}

	// create data string if a campaign is active
	var html_content = quill.getSemanticHTML();
	html_content = html_content.replaceAll("  ", "&nbsp;&nbsp;");
	if (!html_content.includes('<a href="*|UNSUBSCRIBED|*"')) html_content += '<template><a href="*|UNSUBSCRIBED|*" target="_blank"></a></template>';
	var content = `<style>p {margin: 0;} * {font-size: ${standard_text_size}; font-family: ${standard_font}}</style>` + html_content.replaceAll('"', '\\"').replaceAll("<p></p>", "<br>");

	var data = `{
		"subject":"${subject.value}",
		"email_from_name":"${settings.sender_name}",
		"lang":"${settings.lang}",
		"email_from_addr":"${settings.sender_email}",
		"content_html":"${content}",
		"recipients":{
			"all_subscribers": false,
			"expert":{"conditions":[],"id":0},
			"groups":{
				"include":[${newsletter_group.value}]
			},
			"segments":{"include":{}}
		},
		"tracking_link": false,
		"tracking_opening": false,
		"unsub_link": false
	}`;

	data = data.replaceAll("\n", "").replaceAll("\t", "");

	// create new campaign if it doesnt exist
	if (active_campaign == 0) {
		console.log(data)
		var response = await invoke("create_campaign", {data:data});
		var json = JSON.parse(response);

		if (json.result == "success") {
			active_campaign = json.data.id;
			unsaved_campaign = false;

			campaign_list.innerHTML = createCampaignHtml(json.data) + campaign_list.innerHTML;

			document.querySelector(".selected")?.classList.remove("selected");
			document.getElementById(active_campaign).classList.add("selected");

			return true;
		}
		else {
			openDialog("backend_error", JSON.stringify(json.error));
			return false;
		}
	}
	// update existing campaign draft
	else if (campaign_status == "draft") {
		var response = await invoke("update_campaign", {id:active_campaign, data:data});
		var json = JSON.parse(response);

		if (json.result == "success") {
			document.getElementById(json.data.id).children[1].innerHTML = json.data.subject;
			unsaved_campaign = false;
			return true;
		}
		else {
			openDialog("backend_error", JSON.stringify(json.error));
			return false;
		}
	}
	// message when campaign has wrong status
	else {
		openDialog("already_sent");
		return false;
	}
}

// send or test campaign
async function sendCampaign(is_test) {
	var should_continue = await saveCampaign();
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
			openDialog("backend_error", JSON.stringify(json.error));
			return;
		}

		openDialog("sent_test_mail");

		if (el_test_email.value != settings.test_email) {
			settings.test_email = el_test_email.value;
			var response = await invoke("change_config", {data:JSON.stringify([{property:"test_email", value:el_test_email.value}])});
			var json = JSON.parse(response);

			if (json.result != "success") openDialog("backend_error", JSON.stringify(json.error));
		}
	}
	else {
		var response = await invoke("send_campaign", {id:active_campaign});
		var json = JSON.parse(response);

		if (json.result == "success") {
			var json = await getCampaigns();

			if (json == false) return false;

			for (var i = 0; i < json.data.length; i++) {
				var campaign_object = json.data[i];
				if (campaign_object.id == active_campaign && campaign_object.started_at != null) {
					var date = new Date(campaign_object.started_at * 1000);
				}
			}

			var timeout = campaign_object.started_at * 1000 - Date.now() + 8000;

			openDialog("sent_campaign", date.toLocaleString());
			setTimeout(getCredits, 500);
			setTimeout(getCampaigns, timeout);
		}
		else openDialog("backend_error", JSON.stringify(json.error));
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

	initEditor();
}

async function deleteCampaign(id) {
	event.stopPropagation(); 
	var user_action = await openDialog("delete_campaign");
	if (user_action == "dialog_cancel") return false;

	// prevent deleting of newsletter which is currently being sent
	var response = await invoke("get_campaign", {id:id});
	var json = JSON.parse(response);

	if (json.result != "success") {
		openDialog("backend_error", JSON.stringify(json.error));
		return false;
	}

	if (
		json.data.status == "scheduled",
		json.data.status == "scheduled_v1",
		json.data.status == "sending",
		json.data.status == "sending_failed",
		json.data.status == "sending_v1"
	) {
		openDialog("delete_forbidden");
		return false;
	}

	// delete campaign and select new from top
	var response = await invoke("delete_campaign", {id:id});
	var json = JSON.parse(response);

	if (json.result == "success") {
		document.getElementById(id).remove();
		if (id == active_campaign) getCampaign(parseInt(campaign_list.firstElementChild.id));
	}
	else openDialog("backend_error", JSON.stringify(json.error));

	// delete attachments
	var response = await invoke("delete", {path:active_campaign.toString()});
	console.log("Response from deleting attachment: " + response);
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

	changeTab("show_draft");
	active_campaign = 0;
	subject.value = subject.value + " - " + copy;
	attachments.innerHTML = "";
	unsaved_campaign = true;
	document.querySelector(".selected")?.classList.remove("selected");
}


// #####################################################################################
// load all mailinglist and add them to selection
async function getMailinglists() {
	var response = await invoke("get_mailinglists");
	var json = JSON.parse(response);

	if (json.result == "success") {
		var html = "<option style='display: none;' value='' selected></option>";
		
		for (var i = 0; i < json.data.length; i++) {
			html += `<option value="${ json.data[i].id}">${ json.data[i].name}</option>`
		}
		newsletter_group.innerHTML = html;
	}
	else openDialog("backend_error", JSON.stringify(json.error));
}

function openMailinglists() {
	var webview = new t.webviewWindow.WebviewWindow("mailinglists", {
		title: "Manage Mailingslists",
		url: "mailinglists.html",
		width: 680,
		height: 380,
		minWidth: 600,
		minHeight: 280,
		maximizable: false,
		minimizable: false,
		skipTaskbar: true
	});

	webview.once('tauri://error', function (e) {
		if (e.payload == "a webview with label `mailinglists` already exists") {
			webview.setFocus();
		}
	});
}