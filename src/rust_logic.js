var invoke = window.__TAURI__.invoke;
var unsaved_campaign = false;
var active_campaign = null;
var active_error_dialog;
var defined_secrets;

var settings = {email_from_name:"PR-Modellbau", lang:"de_DE", email_from_addr:"info", test_email:"dev@prmodellbau.ch", unsubscribe:"\n\nVom Newsletter abmelden"};

// error and info box
var error_msg = [
	{id:"newsletter_error", title:"Error", msg:"Folgender Fehler ist bei der Synchronisierung mit dem Newsletter Server aufgetreten:<br><br>${additional_info}", buttons:["dialog_ok"]},
	{id:"unsaved_changes", title:"Die Änderungen wurden nicht gespeichert", msg:"Möchten Sie diese speichern?", buttons:["dialog_yes", "dialog_no", "dialog_cancel"]},
	{id:"no_selection", title:"Es ist kein Newsletter ausgewählt", msg:"Wählen Sie einen Newsletter zur Bearbeitung aus", buttons:["dialog_ok"]},
	{id:"no_mailinglist", msg:"Es muss eine Kontaktgruppe vor dem Speichern ausgewählt werden", buttons:["dialog_ok"]},
	{id:"no_subject", msg:"Es muss ein Betreff vor dem Speichern definiert werden", buttons:["dialog_ok"]},
	{id:"no_test_mail", msg:"Für das Senden eines Tests muss eine Test E-Mail Adresse definiert sein", buttons:["dialog_ok"]},
	{id:"sent_test_mail", msg:"Das Testmail wurde erfolgreich versendet", buttons:["dialog_ok"]},
	{id:"sent_campaign", msg:"Der Newsletter wird um ${additional_info} versendet", buttons:["dialog_ok"]},
	{id:"delete_campaign", title:"Der Newsletter wird unwiederruflich gelöscht", msg:"Möchten Sie fortfahren?", buttons:["dialog_yes", "dialog_cancel"]},
	{id:"no_infomaniak_secret", msg:"Der API Key vom Infomaniak Newsletter muss definiert sein, um das Programm nutzen zu können.", buttons:["dialog_ok"]},
	{id:"no_file_upload_auth", msg:"Der API Key vom FTP Server muss definiert sein, wenn sie Dateien hochladen möchten.", buttons:["dialog_ok"]},
	{id:"newsletter_programmed", title:"Speichern nicht möglich", msg:"Dieser Newsletter wird momentan versandt. Das Editieren ist erst möglich, sobald der Newsletter an alle Empfänger versendet wurde.", buttons:["dialog_ok"]},
	{id:"delete_forbidden", title:"Löschen nicht möglich", msg:"Dieser Newsletter wird momentan versandt. Das Löschen ist erst möglich, sobald der Newsletter an alle Empfänger versendet wurde.", buttons:["dialog_ok"]},
	{id:"already_sent", title:"Senden nicht möglich", msg:"Dieser Newsletter wird momentan versandt. Das erneute Senden ist erst möglich, sobald der Newsletter an alle Empfänger versendet wurde.", buttons:["dialog_ok"]}
]

var dialog = document.getElementsByTagName("dialog")[0];

function openDialog(id, additional_info) {
	return new Promise((resolve) => {
		dialog.open = true;

		active_error_dialog = error_msg.find(function(item) { return item.id == id; });

		if (active_error_dialog.title != undefined) dialog.children[0].innerHTML = active_error_dialog.title;
		else dialog.children[0].style.display = "none";

		var msg = active_error_dialog.msg.replace("${additional_info}", additional_info);
		dialog.children[1].innerHTML = msg;

		for (var i = 0; i < active_error_dialog.buttons.length; i++) {
			var button = document.getElementById(active_error_dialog.buttons[i]);
			button.style.display = "inline-block";

			button.addEventListener("click", (e) => {
				resolve(e.target.id);

				dialog.open = false;
				dialog.children[0].style.display = "block";

				var buttons = dialog.getElementsByTagName("button");
				for (var i = 0; i < buttons.length; i++) {
					buttons[i].style.display = "none";
				}
			});
		}
	});
}


// initalize and load everything after document loaded
var campaign_list = document.getElementsByTagName("campaigns")[0];
var test_email = document.getElementById("test_email");
var newsletter_group = document.getElementById("newsletter_group");
var subject = document.getElementById("subject");
var el_credits = document.getElementById("credits");

window.onload = async () => {
	quill.focus();
	test_email.value = settings.test_email;

	var response = await invoke("init_config");
	var json = JSON.parse(response);

	if (json.infomaniak_secret == true) {
		initSettings();
		getCampaigns(true);
		getCredits();
		getMailinglists();
	}
	else {
		console.log("Open Settings");
		// openSettings(true);
	}
}

async function getCredits() {
	var response = await invoke("get_credits");
	var json = JSON.parse(response);
	if (json.result == "success") el_credits.innerHTML = json.data.credits;
	else openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));

}

function initSettings() {
	quill.insertText(0, settings.unsubscribe, {
		link: "*|UNSUBSCRIBED|*",
		size: "9px"
	});

	unsaved_campaign = false;
}

quill.on('text-change', () => { unsaved_campaign = true });

// #####################################################################################
function createCampaignHtml(campaign_object) {
	var html = `
	<campaign id="${campaign_object.id}" onclick="getCampaign(${campaign_object.id})">
		<p>${campaign_object.subject}</p>
		<button onclick="duplicateCampaign(${campaign_object.id})">
			<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5.503 4.627 5.5 6.75v10.504a3.25 3.25 0 0 0 3.25 3.25h8.616a2.251 2.251 0 0 1-2.122 1.5H8.75A4.75 4.75 0 0 1 4 17.254V6.75c0-.98.627-1.815 1.503-2.123ZM17.75 2A2.25 2.25 0 0 1 20 4.25v13a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8.75 2h9Z"/></svg>
			<div>Newsletter duplizieren</div>
		</button>
		<button onclick="deleteCampaign(${campaign_object.id}, true)">
			<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"/></svg>
			<div>Newsletter löschen</div>
		</button>
	</campaign>`

	return html;
}

// load all campaings and show first campaign in editor
async function getCampaigns(first_load) {
	var response = await invoke("get_campaigns");
	var json = JSON.parse(response);

	var html = "";
	var first_id = null;

	for (var i = json.data.data.length - 1; i >= 0; i--) {
		var campaign = json.data.data[i];

		if (first_id == null) { first_id = campaign.id; }
		html += createCampaignHtml(campaign);
	}

	if (first_load) {
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
	else openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
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
			openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
			return false;
		}
	}

	if (wants_sending && campaign_status != 2) {
		openDialog("already_sent");
		return false;
	}

	// check if subject etc. is filled in
	else if (newsletter_group.value == "") {
		openDialog("no_mailinglist");
		return false;
	}
	else if (subject.value == "") {
		openDialog("no_subject");
		return false;
	}

	// create data string if a campaign is active
	var html_content = quill.getSemanticHTML();
	var content = `<style>p {margin: 0;} * {font-size: ${standard_text_size}; font-family: ${standard_font}}</style>` + html_content.replaceAll('"', '\\"').replaceAll("<p></p>", "<br>");

	var data = `{
		"subject":"${subject.value}",
		"email_from_name":"${settings.email_from_name}",
		"lang":"${settings.lang}",
		"email_from_addr":"${settings.email_from_addr}",
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
			openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
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
			openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
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
		if (test_email.value == "") {
			openDialog("no_test_mail");
			return false;
		}

		var response = await invoke("test_campaign", {id:active_campaign, data:`{"email":"${test_email.value}"}`});
		var json = JSON.parse(response);

		if (json.result == "success") openDialog("sent_test_mail");
		else openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
	}
	else {
		// send campaign to mailinglist
		// var response = await invoke("send_campaign", {id:active_campaign});
		var json = JSON.parse(response);

		if (json.result == "success") {
			var date = json.data.scheduled_at.date.replace(" ", "T").slice(0, -3) + "+02:00";
			getCampaigns();
			openDialog("sent_campaign", date.slice(11,16));
			setTimeout(getCredits, 500);
		}
		else openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
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
	initSettings();

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
		openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
		return false;
	}

	// delete campaign and select new from top
	if (user_action == "dialog_yes") {
		document.getElementById(id).remove();
		var response = await invoke("delete_campaign", {id:id});
		var json = JSON.parse(response);
		if (json.result != "success") openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
	}

	if (user) getCampaign(parseInt(campaign_list.firstElementChild.id));
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
	else openDialog("newsletter_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
}