var el_mailinglists = document.getElementsByTagName("list")[0];
var el_contacts = document.getElementsByTagName("contacts")[0];

window.onload = () => {
	getMailinglists(true);
}

function createMailinglistHtml(mailinglist, select_class) {
	var html = `
		<listitem id="${mailinglist.id}" onclick="getMailinglist(${mailinglist.id})" class="${select_class ?? ""}">
			<input disabled value="${mailinglist.name}">
			<button onclick="startRenamingMailinglist(this)">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M9.75 2h3.998a.75.75 0 0 1 .102 1.493l-.102.007H12.5v17h1.246a.75.75 0 0 1 .743.648l.007.102a.75.75 0 0 1-.648.743l-.102.007H9.75a.75.75 0 0 1-.102-1.493l.102-.007h1.249v-17H9.75a.75.75 0 0 1-.743-.648L9 2.75a.75.75 0 0 1 .648-.743L9.75 2Zm8.496 2.997a3.253 3.253 0 0 1 3.25 3.25l.004 7.504a3.249 3.249 0 0 1-3.064 3.246l-.186.005h-4.745V4.996h4.74Zm-8.249 0L9.992 19H5.25A3.25 3.25 0 0 1 2 15.751V8.247a3.25 3.25 0 0 1 3.25-3.25h4.747Z"/></svg>
				<div>Kontaktgruppe umbenennen</div>
			</button>
			<button onclick="duplicateMailinglist(${mailinglist.id})">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5.503 4.627 5.5 6.75v10.504a3.25 3.25 0 0 0 3.25 3.25h8.616a2.251 2.251 0 0 1-2.122 1.5H8.75A4.75 4.75 0 0 1 4 17.254V6.75c0-.98.627-1.815 1.503-2.123ZM17.75 2A2.25 2.25 0 0 1 20 4.25v13a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8.75 2h9Z"/></svg>
				<div>Kontaktgruppe duplizieren</div>
			</button>
			<button onclick="deleteMailinglist(${mailinglist.id})">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"/></svg>
				<div>Kontaktgruppe löschen</div>
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
		openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
		return false;
	}

	var html = "";
	var first_id = null;

	for (var i = json.data.data.length - 1; i >= 0; i--) {
		var mailinglist = json.data.data[i];
		var select_class = "";

		if (first_id == null) {
			first_id = mailinglist.id;
			select_class = "selected";
		}
		html += createMailinglistHtml(mailinglist, select_class);
	}

	if (first_load) getMailinglist(first_id);
	el_mailinglists.innerHTML = html;
}

async function deleteMailinglist(id) {
	event.stopPropagation(); 
	var user_action = await openDialog("delete_mailinglist");

	if (user_action == "dialog_yes") {
		var response = await invoke("delete_mailinglist", {id:id});
		var json = JSON.parse(response);
		if (json.result == "success") {
			document.getElementById(id).remove();
			getMailinglist(parseInt(el_mailinglists.firstElementChild.id));
		}
		else openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
	}
}

async function duplicateMailinglist(id) {
	event.stopPropagation();

	// create new mailinglist with name
	var response_list = await invoke("create_mailinglist", {data:`{\"name\":\"${document.getElementById(id).firstElementChild.innerHTML} - Kopie\"}`});
	var json_list = JSON.parse(response_list);
	if (json_list.result != "success") {
		openDialog("backend_error", Array.isArray(json_list.error) ? json_list.error.join(" | ") : (json_list.error ?? ""));
		return;
	}

	// load contacts of selected mailinglist
	var reponse_contact = await invoke("mailinglist_get_contacts", {id:id});
	var json_contact = JSON.parse(reponse_contact);
	if (json_contact.result != "success") {
		openDialog("backend_error", Array.isArray(json_contact.error) ? json_contact.error.join(" | ") : (json_contact.error ?? ""));
		return;

	}

	// upload and show contacts of new mailing list
	var new_contacts = [];
	var html = "";
	for (var i = 0; i < json_contact.data.data.length; i++) {
		var contact = json_contact.data.data[i];
		if (contact.status_label == "Inscrit") {
			new_contacts.join({email: contact.email});
			html += createContactHtml(contact.email);
		}
	}

	var response_list = await invoke("mailinglist_add_contact", {id: json_list.data.id, data: JSON.stringify(new_contacts)});
	var json_list = JSON.parse(response_list);
	if (json_list.result != "success") {
		openDialog("backend_error", Array.isArray(json_list.error) ? json_list.error.join(" | ") : (json_list.error ?? ""));
		return;
	}

	// show mailinglist
	document.getElementsByClassName("selected")[0].classList.remove("selected");

	var current_html = el_mailinglists.innerHTML;
	var html = createMailinglistHtml(json_list.data, "selected");
	el_mailinglists.innerHTML = html + current_html;
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
			openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
			e.target.value = e.target.getAttribute("data-old-value");
		}
	}
	else if (e.type == "keydown" && e.key == "Escape") e.target.value = e.target.getAttribute("data-old-value");
	else return;
	
	// disable input
	e.target.removeEventListener("blur", renameMailinglist);
	e.target.removeEventListener("keydown", renameMailinglist);
	e.target.blur();
	setTimeout(() => { e.target.disabled = true }, 100);
}



function createContactHtml(email) {
	var html = `
		<contact>
			<p>${email}</p>
			<button onclick="deleteContact(${email})">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"/></svg>
				<div>Aus Kontaktgruppe entfernen</div>
			</button>
		</contact>
	`;
	return html
}

// get specific mailing list and show it
async function getMailinglist(id) {	
	var response = await invoke("mailinglist_get_contacts", {id:id});
	var json = JSON.parse(response);

	if (json.result == "success") {
		var html = "";

		for (var i = json.data.data.length - 1; i >= 0; i--) {
			var contact = json.data.data[i];

			if (contact.status_label == "Desinscrit") {} // abgemeldet

			html += createContactHtml(contact.email);
		}

		el_contacts.innerHTML = html;
	}

	else openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
}

async function deleteContact(id) {
	var response = await invoke("mailinglist_remove_contact", {id:id, data:`{\"email\":\"test1@mydomain.com\", \"status\":\"delete\"}`});
	var json = JSON.parse(response);

	if (json.result == "success") {
		document.getElementById(id).remove();
		getMailinglist(parseInt(el_mailinglists.firstElementChild.id));
	}
	else openDialog("backend_error", Array.isArray(json.error) ? json.error.join(" | ") : (json.error ?? ""));
}