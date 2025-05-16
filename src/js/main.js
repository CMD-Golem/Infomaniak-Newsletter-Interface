const t = window.__TAURI__;
const invoke = window.__TAURI__.core.invoke;
var active_error_dialog, tooltip_timeout;
var dialog = document.querySelector("dialog");
var tooltip = document.querySelector("tooltip");

const text_open_files = "Alle Dateien";
const text_suggest_name = "Neue Datei.";
var schedule_delay_ms = 10000; // seems like it has to be at least 1min

// error and info box
const error_msg = [
	{id:"backend_error", title:"Error", msg:"Folgender Fehler ist bei der Synchronisierung mit dem Newsletter Server aufgetreten:<br><br>${additional_info}", buttons:["dialog_ok"]},
	{id:"unsaved_changes", title:"Die Änderungen wurden nicht gespeichert", msg:"Möchten Sie diese speichern?", buttons:["dialog_yes", "dialog_no", "dialog_cancel"]},
	{id:"no_selection", msg:"Erstelle zuerst ein neuer Newsletter.", buttons:["dialog_ok"]},
	{id:"no_selected_mailinglist", msg:"Es muss eine Kontaktgruppe vor dem Speichern ausgewählt werden", buttons:["dialog_ok"]},
	{id:"no_subject", msg:"Es muss ein Betreff vor dem Speichern definiert werden", buttons:["dialog_ok"]},
	{id:"no_test_mail", msg:"Für das Senden eines Tests muss eine Test E-Mail Adresse definiert sein", buttons:["dialog_ok"]},
	{id:"sent_test_mail", msg:"Das Testmail wurde erfolgreich versendet", buttons:["dialog_ok"]},
	{id:"sent_campaign", msg:"Der Newsletter startet in 60s mit dem Versand", buttons:["dialog_ok"]},
	{id:"delete_campaign", title:"Der Newsletter wird unwiederruflich gelöscht", msg:"Möchten Sie fortfahren?", buttons:["dialog_yes", "dialog_cancel"]},
	{id:"no_file_upload_auth", msg:"Die WebDav Server Daten müssen ausgefüllt sein um Bilder und Dateien hochzuladen.", buttons:["dialog_ok"]},
	{id:"undefined_settings", msg:"Der API Key vom Infomaniak Newsletter und alle Einstellungen müssen definiert sein, um das Programm nutzen zu können.", buttons:["dialog_ok"]},
	{id:"newsletter_programmed", title:"Speichern nicht möglich", msg:"Dieser Newsletter wird momentan versandt. Das Editieren ist erst möglich, sobald der Newsletter an alle Empfänger versendet wurde.", buttons:["dialog_ok"]},
	{id:"delete_forbidden", title:"Löschen nicht möglich", msg:"Dieser Newsletter wird momentan versandt. Das Löschen ist erst möglich, sobald der Newsletter an alle Empfänger versendet wurde.", buttons:["dialog_ok"]},
	{id:"already_sent", title:"Newsletter bereits versendet", msg:"Erstelle eine Kopie von diesem Newsletter um ihn erneut zu verschicken.", buttons:["dialog_ok"]},
	{id:"delete_mailinglist", title:"Die Kontaktgruppe wird unwiederruflich gelöscht", msg:"Möchten Sie fortfahren?", buttons:["dialog_yes", "dialog_cancel"]},
	{id:"delete_contact", title:"Der Kontakt wird unwiederruflich gelöscht", msg:"Möchten Sie fortfahren?", buttons:["dialog_yes", "dialog_cancel"]},
	{id:"no_mailinglist", msg:"Erstelle zuerst eine neue Kontaktgruppe.", buttons:["dialog_ok"]},
	{id:"embed", msg:"Soll das Bild eingebettet werden?", buttons:["dialog_yes", "dialog_no", "dialog_cancel"]},
	{id:"delete_attachment", title:"Die Datei wird unwiederruflich gelöscht und vom Server entfernt", msg:"Möchten Sie fortfahren?", buttons:["dialog_yes", "dialog_cancel"]},
	{id:"wait_before_sending", title:"Nach dem Erstellen muss mindesten 1 min gewartet werden, bis der Newsletter gesendet werden kann.", msg:"Um ${additional_info} kann dieser Newsletter frühstens versendet werden.", buttons:["dialog_ok"]},
]

// status translation
const campaign_states = [
	{status:"blocked", description:"Blockiert", icon:'<path d="M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12 6.477 2 12 2Zm.002 13.004a.999.999 0 1 0 0 1.997.999.999 0 0 0 0-1.997ZM12 7a1 1 0 0 0-.993.884L11 8l.002 5.001.007.117a1 1 0 0 0 1.986 0l.007-.117L13 8l-.007-.117A1 1 0 0 0 12 7Z"/>'},
	{status:"canceled", description:"Abgebrochen", icon:'<path d="M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12 6.477 2 12 2Zm.002 13.004a.999.999 0 1 0 0 1.997.999.999 0 0 0 0-1.997ZM12 7a1 1 0 0 0-.993.884L11 8l.002 5.001.007.117a1 1 0 0 0 1.986 0l.007-.117L13 8l-.007-.117A1 1 0 0 0 12 7Z"/>'},
	{status:"draft", description:"Entwurf", icon:'<path d="M13.939 5 19 10.06 9.062 20a2.25 2.25 0 0 1-1 .58l-5.115 1.395a.75.75 0 0 1-.92-.921l1.394-5.116a2.25 2.25 0 0 1 .58-.999L13.94 5Zm-7.414 6-1.5 1.5H2.75a.75.75 0 0 1 0-1.5h3.775Zm14.352-8.174.153.144.145.153a3.579 3.579 0 0 1-.145 4.908L20.06 9l-5.061-5.06.97-.97a3.579 3.579 0 0 1 4.908-.144ZM10.525 7l-1.5 1.5H2.75a.75.75 0 1 1 0-1.5h7.775Zm4-4-1.5 1.5H2.75a.75.75 0 1 1 0-1.5h11.775Z"/>'},
	{status:"scheduled", description:"Geplant", icon:'<path d="M12 5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 3a.75.75 0 0 0-.743.648l-.007.102v4.5l.007.102a.75.75 0 0 0 1.486 0l.007-.102v-4.5l-.007-.102A.75.75 0 0 0 12 8Zm7.17-2.877.082.061 1.149 1a.75.75 0 0 1-.904 1.193l-.081-.061-1.149-1a.75.75 0 0 1 .903-1.193ZM14.25 2.5a.75.75 0 0 1 .102 1.493L14.25 4h-4.5a.75.75 0 0 1-.102-1.493L9.75 2.5h4.5Z"/>'},
	{status:"scheduled_v1", description:"Geplant", icon:'<path d="M12 5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 3a.75.75 0 0 0-.743.648l-.007.102v4.5l.007.102a.75.75 0 0 0 1.486 0l.007-.102v-4.5l-.007-.102A.75.75 0 0 0 12 8Zm7.17-2.877.082.061 1.149 1a.75.75 0 0 1-.904 1.193l-.081-.061-1.149-1a.75.75 0 0 1 .903-1.193ZM14.25 2.5a.75.75 0 0 1 .102 1.493L14.25 4h-4.5a.75.75 0 0 1-.102-1.493L9.75 2.5h4.5Z"/>'},
	{status:"sending", description:"Wird gesendet", icon:'<path d="M12 5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 3a.75.75 0 0 0-.743.648l-.007.102v4.5l.007.102a.75.75 0 0 0 1.486 0l.007-.102v-4.5l-.007-.102A.75.75 0 0 0 12 8Zm7.17-2.877.082.061 1.149 1a.75.75 0 0 1-.904 1.193l-.081-.061-1.149-1a.75.75 0 0 1 .903-1.193ZM14.25 2.5a.75.75 0 0 1 .102 1.493L14.25 4h-4.5a.75.75 0 0 1-.102-1.493L9.75 2.5h4.5Z"/>'},
	{status:"sending_failed", description:"Senden fehlgeschlagen", icon:'<path d="M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12 6.477 2 12 2Zm.002 13.004a.999.999 0 1 0 0 1.997.999.999 0 0 0 0-1.997ZM12 7a1 1 0 0 0-.993.884L11 8l.002 5.001.007.117a1 1 0 0 0 1.986 0l.007-.117L13 8l-.007-.117A1 1 0 0 0 12 7Z"/>'},
	{status:"sending_v1", description:"Wird gesendet", icon:'<path d="M12 5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 3a.75.75 0 0 0-.743.648l-.007.102v4.5l.007.102a.75.75 0 0 0 1.486 0l.007-.102v-4.5l-.007-.102A.75.75 0 0 0 12 8Zm7.17-2.877.082.061 1.149 1a.75.75 0 0 1-.904 1.193l-.081-.061-1.149-1a.75.75 0 0 1 .903-1.193ZM14.25 2.5a.75.75 0 0 1 .102 1.493L14.25 4h-4.5a.75.75 0 0 1-.102-1.493L9.75 2.5h4.5Z"/>'},
	{status:"sent", description:"Gesendet", icon:'<path d="M22 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Zm-2.146-2.354a.5.5 0 0 0-.708 0L15.5 7.793l-1.646-1.647a.5.5 0 0 0-.708.708l2 2a.5.5 0 0 0 .708 0l4-4a.5.5 0 0 0 0-.708Zm-.354 8.122V14H15a.75.75 0 0 0-.75.75 2.25 2.25 0 0 1-4.5 0l-.007-.102A.75.75 0 0 0 9 14H4.5V7.25c0-.966.784-1.75 1.75-1.75h3.826c.081-.523.224-1.026.422-1.5H6.25A3.25 3.25 0 0 0 3 7.25v11.5A3.25 3.25 0 0 0 6.25 22h11.5A3.25 3.25 0 0 0 21 18.75v-7.56c-.444.427-.949.79-1.5 1.078Z"/>'},
	{status:"unknown", description:"Status unbekannt", icon:'<path d="M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12 6.477 2 12 2Zm.002 13.004a.999.999 0 1 0 0 1.997.999.999 0 0 0 0-1.997ZM12 7a1 1 0 0 0-.993.884L11 8l.002 5.001.007.117a1 1 0 0 0 1.986 0l.007-.117L13 8l-.007-.117A1 1 0 0 0 12 7Z"/>'}
]


const mailinglist_states = {active:"Aktiv", bounced:"Nicht erreichbar", junk:"Gelöscht?", unconfirmed:"Unbestätigt", unsubscribed:"Abgemeldet"}


// general functions
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

// tooltip
function showTooltip(el, pos, tip) {
	var el_pos = el.getBoundingClientRect();

	if (pos == 0) { // tooltip above el
		var correction_top = -10;
		var correction_left = el_pos.width /2;
		var transform = "-50%, -100%";
	}
	else if (pos == 1) { // tooltip right of el
		var correction_top = el_pos.height /2;
		var correction_left = el_pos.width +5;
		var transform = "0, -50%";
	}
	else if (pos == 2) { // tooltip underneath el
		var correction_top = el_pos.height +5;
		var correction_left = el_pos.width /2;
		var transform = "-50%, 0";
	}
	else if (pos == 3) { // tooltip left of el
		var correction_top = el_pos.height /2;
		var correction_left = -5;
		var transform = "-100%, -50%";
	}

	tooltip_timeout = setTimeout(() => {
		tooltip.setAttribute("style", `display: block; top: ${el_pos.top + correction_top}px; left: ${el_pos.left + correction_left}px; transform: translate(${transform});`);
		tooltip.innerHTML = tip;
	}, 1000);

	el.addEventListener("mouseleave", () => {
		if (tooltip_timeout != undefined) clearTimeout(tooltip_timeout);
		tooltip.removeAttribute("style");
		tooltip_timeout = undefined;
	}, {once: true});
}