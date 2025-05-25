var el_mailinglists = document.querySelector("list");
var el_contacts = document.querySelector("contacts");
var el_add_contact = document.querySelector("textarea");
var email_validation = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var contact_sorting = "0";

window.onload = () => {
	if (invoke == undefined) return;

	getMailinglists(true);
	document.querySelector("body").addEventListener("contextmenu", (e) => e.preventDefault());
}

function createMailinglistHtml(mailinglist, select_class) {
	var html = `
		<listitem id="${mailinglist.id}" onclick="getMailinglist(this.id, true)" class="${select_class ?? ""}">
			<input disabled value="${mailinglist.name}">
			<button onclick="startRenamingMailinglist(this)" onmouseenter="showTooltip(this, 2, 'Kontaktgruppe umbenennen')">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M9.75 2h3.998a.75.75 0 0 1 .102 1.493l-.102.007H12.5v17h1.246a.75.75 0 0 1 .743.648l.007.102a.75.75 0 0 1-.648.743l-.102.007H9.75a.75.75 0 0 1-.102-1.493l.102-.007h1.249v-17H9.75a.75.75 0 0 1-.743-.648L9 2.75a.75.75 0 0 1 .648-.743L9.75 2Zm8.496 2.997a3.253 3.253 0 0 1 3.25 3.25l.004 7.504a3.249 3.249 0 0 1-3.064 3.246l-.186.005h-4.745V4.996h4.74Zm-8.249 0L9.992 19H5.25A3.25 3.25 0 0 1 2 15.751V8.247a3.25 3.25 0 0 1 3.25-3.25h4.747Z"/></svg>
			</button>
			<button onclick="duplicateMailinglist(this.parentElement.id)" onmouseenter="showTooltip(this, 2, 'Kontaktgruppe duplizieren')">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5.503 4.627 5.5 6.75v10.504a3.25 3.25 0 0 0 3.25 3.25h8.616a2.251 2.251 0 0 1-2.122 1.5H8.75A4.75 4.75 0 0 1 4 17.254V6.75c0-.98.627-1.815 1.503-2.123ZM17.75 2A2.25 2.25 0 0 1 20 4.25v13a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8.75 2h9Z"/></svg>
			</button>
			<button onclick="deleteMailinglist(this.parentElement.id)" onmouseenter="showTooltip(this, 2, 'Kontaktgruppe löschen')">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"/></svg>
			</button>
		</listitem>
	`;
	return html
}

// load all mailinglists and show first mailing list
async function getMailinglists(first_load) {
	var response = await invoke("get_mailinglists");
	var json = JSON.parse(response);

	if (json.result != "success") {
		openDialog("backend_error", JSON.stringify(json.error));
		return false;
	}

	var html = "";

	for (var i = json.data.length - 1; i >= 0; i--) {
		html += createMailinglistHtml(json.data[i], "");
	}

	if (first_load && json.data.length != 0) {
		getMailinglist(json.data[json.data.length - 1].id, false);
	}
	el_mailinglists.innerHTML = html;
}

async function deleteMailinglist(id) {
	event.stopPropagation(); 
	var user_action = await openDialog("delete_mailinglist");
	if (user_action == "dialog_cancel") return;

	var response = await invoke("delete_mailinglist", {id:parseInt(id)});
	var json = JSON.parse(response);

	if (json.result == "success") {
		document.getElementById(id).remove();
		await t.event.emit('changed_mailinglists');
		getMailinglist(el_mailinglists.firstElementChild?.id, false);
	}
	else openDialog("backend_error", JSON.stringify(json.error));
}

async function duplicateMailinglist(id) {
	event.stopPropagation();

	// create new mailinglist with name
	var response_list = await invoke("create_mailinglist", {data:`{"name":"${document.getElementById(id).firstElementChild.value} - Kopie"}`});
	var json_list = JSON.parse(response_list);
	if (json_list.result != "success") {
		openDialog("backend_error", JSON.stringify(json_list.error));
		return;
	}

	// show mailinglist
	document.querySelector(".selected").classList.remove("selected");
	var html = createMailinglistHtml(json_list.data, "selected");
	el_mailinglists.insertAdjacentHTML('afterbegin', html);
	await t.event.emit('changed_mailinglists');

	// load contacts of selected mailinglist
	var reponse_contact = await invoke("mailinglist_get_contacts", {id:parseInt(id)});
	var json_contact = JSON.parse(reponse_contact);
	if (json_contact.result != "success") {
		openDialog("backend_error", JSON.stringify(json_contact.error));
		return;
	}

	// upload and show contacts of new mailing list
	var new_contacts = {subscriber_ids:[]};
	for (var i = 0; i < json_contact.data.length; i++) {
		new_contacts.subscriber_ids.push(json_contact.data[i].id);
	}

	var response_list = await invoke("mailinglist_assign_contacts", {id: json_list.data.id, data: JSON.stringify(new_contacts)});
	var json_list = JSON.parse(response_list);
	if (json_list.result != "success") {
		openDialog("backend_error", JSON.stringify(json_list.error));
		return;
	}
}

function startCreatingMailinglist() {
	// create html
	document.querySelector(".selected")?.classList.remove("selected");
	var html = createMailinglistHtml({id:0, name:"Neue Kontaktgruppe"}, "selected");
	el_mailinglists.insertAdjacentHTML('beforeend', html);

	// get input element and add attributes
	var input = document.getElementById("0").firstElementChild;

	input.disabled = false;
	input.focus();
	input.select();

	input.addEventListener("blur", createMailinglist);
	input.addEventListener("keydown", createMailinglist);
}

async function createMailinglist(e) {
	var remove = false;

	if (e.type == "blur" || (e.type == "keydown" && e.key == "Enter")) {
		var response = await invoke("create_mailinglist", {data:`{"name":"${e.target.value}"}`});
		var json = JSON.parse(response);

		if (json.result != "success") {
			openDialog("backend_error", JSON.stringify(json.error));
			remove = true;
		}
		else {
			e.target.parentElement.id = json.data.id;
			e.target.value = json.data.name;
			el_contacts.innerHTML = "";
			await t.event.emit('changed_mailinglists');
			setTimeout(() => { e.target.disabled = true }, 100);
		}
	}
	else if (e.type == "keydown" && e.key == "Escape") remove = true;
	else return;

	// disable input
	e.target.removeEventListener("blur", createMailinglist);
	e.target.removeEventListener("keydown", createMailinglist);
	e.target.blur();
	if (remove) e.target.parentElement.remove();
}

function startRenamingMailinglist(el) {
	var input = el.previousElementSibling;
	input.disabled = false;
	input.focus();
	input.select();

	input.setAttribute("data-old-value", input.value)
	input.addEventListener("blur", renameMailinglist);
	input.addEventListener("keydown", renameMailinglist);
}

async function renameMailinglist(e) {
	if (e.type == "blur" || (e.type == "keydown" && e.key == "Enter")) {
		var response = await invoke("update_mailinglist", {id: parseInt(e.target.parentElement.id), data:`{\"name\":\"${e.target.value}\"}`});
		var json = JSON.parse(response);

		if (json.result != "success") {
			openDialog("backend_error", JSON.stringify(json.error));
			e.target.value = e.target.getAttribute("data-old-value");
		}
		else await t.event.emit('changed_mailinglists');
	}
	else if (e.type == "keydown" && e.key == "Escape") e.target.value = e.target.getAttribute("data-old-value");
	else return;
	
	// disable input
	e.target.removeEventListener("blur", renameMailinglist);
	e.target.removeEventListener("keydown", renameMailinglist);
	e.target.blur();
	setTimeout(() => { e.target.disabled = true }, 100);
}



function createContactHtml(contact) {
	var html = `
		<contact id="${contact.id}">
			<p>${contact.email}</p>
			<p>${mailinglist_states[contact.status]}</p>
			<button onclick="deleteContact(${contact.id})" onmouseenter="showTooltip(this, 3, 'Aus Kontaktgruppe entfernen')">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"/></svg>
			</button>
		</contact>
	`;
	return html
}

// get specific mailing list and show it
async function getMailinglist(id, check_already_selected) {
	if (check_already_selected && document.getElementById(id).classList.contains("selected")) return

	var response = await invoke("mailinglist_get_contacts", {id:parseInt(id)});
	var json = JSON.parse(response);

	if (json.result != "success") {
		openDialog("backend_error", JSON.stringify(json.error));
		return;
	}
	
	var html = "";
	var data = json.data;

	if (contact_sorting == "1") { // Z-A
		data.sort((a, b) => {
			if (a.email < b.email) return 1;
			if (a.email > b.email) return -1;
			return 0;
		});
	}
	else if (contact_sorting == "2") { // info
		data.sort((a, b) => {
			// Handle special case for status 1
			if (a.status === 1 && b.status !== 1) return 1;
			if (b.status === 1 && a.status !== 1) return -1;
			
			// Sort by status in descending order
			if (a.status !== b.status) return b.status - a.status;
			
			// Sort by name in ascending order if statuses are equal
			return a.email.localeCompare(b.email);
		});
	}
	else { // A-Z
		data.sort((a, b) => {
			if (a.email < b.email) return -1;
			if (a.email > b.email) return 1;
			return 0;
		});
	}

	for (var i = 0; i < data.length; i++) html += createContactHtml(data[i]);

	document.querySelector(".selected")?.classList.remove("selected");
	document.getElementById(id).classList.add("selected");

	el_contacts.innerHTML = html;
}

function reloadMailingList(new_sort) {
	var id = document.querySelector('.selected')?.id;
	if (new_sort != undefined) contact_sorting = new_sort;
	if (id != undefined) getMailinglist(id, false);
}

async function deleteContact(id) {
	// ask user again
	var user_action = await openDialog("delete_contact");
	if (user_action == "dialog_cancel") return;

	var mailinglist_id = document.querySelector(".selected")?.id;

	if (mailinglist_id == undefined) {
		openDialog("no_mailinglist");
		return;
	}

	var response = await invoke("mailinglist_remove_contact", {subscriber:id, group:parseInt(mailinglist_id)});

	var json = JSON.parse(response);

	if (json.result == "success") document.getElementById(id).remove();
	else openDialog("backend_error", JSON.stringify(json.error));
}

function checkContact() {
	if (el_add_contact.value.includes("\n")) newContact();
}

async function newContact() {
	var id = document.querySelector(".selected")?.id;
	if (id == undefined) {
		openDialog("no_mailinglist");
		return;
	}

	var input_value = el_add_contact.value;
	var new_contacts = input_value.split(/\s*,\s*|\s+|\n/);
	el_add_contact.value = "";

	// catch empty enter
	if (
		(new_contacts.length == 1 && new_contacts[0] == "") || 
		(new_contacts.length == 2 && new_contacts[0] == "" && new_contacts[1] == "")
	) return;

	for (var i = 0; i < new_contacts.length; i++) {
		if (email_validation.test(new_contacts[i])) {
			var response = await invoke("mailinglist_add_contact", {group:parseInt(id), email:new_contacts[i]});
			var json = JSON.parse(response);
			if (json.result != "success") openDialog("backend_error", JSON.stringify(json.error));
		}
	}

	// setTimeout(getMailinglist, 800, id, false);
	getMailinglist(id, false)
}
