var invoke = window.__TAURI__.invoke;
var unsaved_campaign = false;
var active_campaign = null;

var settings = {email_from_name:"PR-Modellbau", lang:"de_DE", email_from_addr:"info", test_email:"dev@prmodellbau.ch", unsubscribe:"\n\nVom Newsletter abmelden"};

var error_msg = [
	{id:"newsletter_error", title:"Error", msg:"Ein Fehler mit der Synchronisierung vom Newsletter Server ist aufgetreten", buttons:["dialog_ok"]},
	{id:"unsaved_changes", title:"Die Änderungen wurden nicht gespeichert", msg:"Möchten Sie diese speichern?", buttons:["dialog_yes", "dialog_no", "dialog_cancel"]},
	{id:"no_selection", title:"Es ist kein Newsletter ausgewählt", msg:"${additional_info}", fallback_msg:"Wählen Sie einen Newsletter zur Bearbeitung aus", buttons:["dialog_ok"]},
	{id:"no_mailinglist", msg:"Es muss eine Kontaktgruppe vor dem Speichern ausgewählt werden", buttons:["dialog_ok"]},
	{id:"no_subject", msg:"Es muss ein Betreff vor dem Speichern definiert werden", buttons:["dialog_ok"]},
	{id:"no_test_mail", msg:"Für das Senden eines Tests muss eine Test E-Mail Adresse definiert sein", buttons:["dialog_ok"]},
	{id:"sent_test_mail", msg:"Das Testmail wurde erfolgreich versendet", buttons:["dialog_ok"]},
	{id:"sent_campaign", msg:"Der Newsletter wird um ${additional_info} versendet", buttons:["dialog_ok"]},
	{id:"delete_campaign", title:"Der Newsletter wird unwiederruflich gelöscht", msg:"Möchten Sie fortfahren?", buttons:["dialog_yes", "dialog_cancel"]}
]

var dialog = document.getElementsByTagName("dialog")[0];
var active_error_dialog;

function openDialog(id, additional_info) {
	return new Promise((resolve, reject) => {
		dialog.open = true;

		active_error_dialog = error_msg.find(function(item) {
			return item.id == id;
		});

		if (active_error_dialog.title != undefined) dialog.children[0].innerHTML = active_error_dialog.title;
		else dialog.children[0].style.display = "none";

		var msg = active_error_dialog.msg.replace("${additional_info}", additional_info);
		dialog.children[1].innerHTML = msg;

		for (var i = 0; i < active_error_dialog.buttons.length; i++) {
			document.getElementById(active_error_dialog.buttons[i]).style.display = "inline-block";

			active_error_dialog.buttons[i].addEventListener("click", () => {
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

window.onload = () => {
	quill.focus();
	test_email.value = settings.test_email;

	getCampaigns(true);
	getCredits();
	getMailinglists();
	initSettings();
}

async function getCredits() {
	var response = await invoke("get_credits");
	var json = JSON.parse(response);
	el_credits.innerHTML = json.data.credits;
}

function initSettings() {
	quill.insertText(0, settings.unsubscribe, {
		link: "*|UNSUBSCRIBED|*",
		size: "9px"
	});
}

// #####################################################################################
function createCampaignHtml(campaign_object) {
	if (campaign_object.started_at != null) {
		var date = campaign_object.started_at.date.replace(" ", "T").slice(0, -3) + "+02:00";
	}
	else {
		var date = null;
	}

	var html = `
	<campaign id="${campaign_object.id}" data-last-send="${date}" onclick="getCampaign(${campaign_object.id})">
		<p>${campaign_object.subject}</p>
		<button onclick="duplicateCampaign(${campaign_object.id})">
			<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5.503 4.627 5.5 6.75v10.504a3.25 3.25 0 0 0 3.25 3.25h8.616a2.251 2.251 0 0 1-2.122 1.5H8.75A4.75 4.75 0 0 1 4 17.254V6.75c0-.98.627-1.815 1.503-2.123ZM17.75 2A2.25 2.25 0 0 1 20 4.25v13a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8.75 2h9Z"/></svg>
			<div>Newsletter duplizieren</div>
		</button>
		<button onclick="deleteCampaign(${campaign_object.id})">
			<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"/></svg>
			<div>Newsletter löschen</div>
		</button>
	</campaign>`

	return html;
}

function checkUnsaved() {
	if (!(unsaved_campaign && confirm("Add better warning for unsaved campaign"))) {

		openDialog("unsaved_changes", additional_info)

		return;
	}
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
	if (checkUnsaved()) { return; }

	var response = await invoke("get_campaign", {id:id});
	var json = JSON.parse(response);

	quill.clipboard.dangerouslyPasteHTML(json.data.content)
	subject.value = json.data.subject;

	if (json.data.mailinglists[0] == undefined) {
		newsletter_group.value = "";
	}
	else {
		newsletter_group.value = json.data.mailinglists[0].id;
	}

	active_campaign = id;
}

async function saveCampaign() {
	// check for active campaign
	if (active_campaign == null) {
		confirm("Kein Newsletter ist ausgewählt");
		return false;
	}

	// check if subject etc. is filled in
	if (newsletter_group.value == "") {
		confirm("Eine Kontaktgruppe muss vor dem Speichern definiert werden");
		return false;
	}
	else if (subject.value == "") {
		confirm("Ein Betreff muss vor dem Speichern definiert werden");
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

	// create new campaign if it doesnt exist
	if (active_campaign == 0) {
		var response = await invoke("create_campaign", {data:data});
		var json = JSON.parse(response);
		active_campaign = json.data.id;

		var current_html = campaign_list.innerHTML;
		var html = createCampaignHtml(json.data);

		campaign_list.innerHTML = html + current_html;

		console.log(json)
	}
	// update existing campaign
	else {
		var response = await invoke("update_campaign", {id:active_campaign, data:data});
		var json = JSON.parse(response);

		document.getElementById(json.data.id).firstElementChild.innerHTML = json.data.subject;
		console.log(json)
	}

	return response;
}

// send or test campaign
async function sendCampaign(is_test) {
	var response = saveCampaign();

	if (response == false) { return; }

	// send test mail
	if (is_test) {
		if (test_email.value == "") {
			confirm("Für das Senden eines Tests muss eine E-Mail Adresse definiert sein");
			return;
		}

		var response = await invoke("test_campaign", {id:active_campaign, data:`{"email":"${test_email.value}"}`});
		var json = JSON.parse(response);
		alert("Testmail wurde versendet");
		console.log(json)
	}
	// send campaign to mailinglist
	else {
		var response = await invoke("send_campaign", {id:active_campaign});
		var json = JSON.parse(response);

		var date = json.data.scheduled_at.date.replace(" ", "T").slice(0, -3) + "+02:00";
		alert("Der Newsletter wird um " + date.slice(11,16) + " versendet");

		// var scheduled_date = new Date(date);
		// var current_date = new Date();
		// var waiting_ms = scheduled_date.getTime() - current_date.getTime() + 1000;

		setTimeout(getCredits, 500);
		console.log(json)
	}
}


// Prepare to create new campaign
function startCampaign() {
	if (checkUnsaved()) { return; }

	editor_el.firstChild.innerHTML = "";
	subject.value = "";
	newsletter_group.value = "";
	initSettings();

	active_campaign = 0;
}

async function deleteCampaign(id) {
	event.stopPropagation();
	document.getElementById(id).remove();
	var response = await invoke("delete_campaign", {id:id});
	var json = JSON.parse(response);
	console.log(json)
}

function duplicateCampaign(id) {
	event.stopPropagation();
	if (checkUnsaved()) { return; }

	getCampaign(id);
	active_campaign = 0;
	saveCampaign();
}


// #####################################################################################
// load all mailinglist and add them to selection
async function getMailinglists() {
	var response = await invoke("get_mailinglists");
	var json = JSON.parse(response);
	var html = "<option style='display: none;' value='' selected></option>";
	
	for (var i = 0; i < json.data.data.length; i++) {
		var mailinglist = json.data.data[i];
		html += `<option value="${mailinglist.id}">${mailinglist.name}</option>`
	}
	newsletter_group.innerHTML = html;
}