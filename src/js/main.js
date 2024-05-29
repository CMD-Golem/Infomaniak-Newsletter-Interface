var invoke = window.__TAURI__.invoke;
var active_error_dialog;
var dialog = document.getElementsByTagName("dialog")[0];

// error and info box
var error_msg = [
	{id:"backend_error", title:"Error", msg:"Folgender Fehler ist bei der Synchronisierung mit dem Newsletter Server aufgetreten:<br><br>${additional_info}", buttons:["dialog_ok"]},
	{id:"unsaved_changes", title:"Die Änderungen wurden nicht gespeichert", msg:"Möchten Sie diese speichern?", buttons:["dialog_yes", "dialog_no", "dialog_cancel"]},
	{id:"no_selection", title:"Es ist kein Newsletter ausgewählt", msg:"Wählen Sie einen Newsletter zur Bearbeitung aus", buttons:["dialog_ok"]},
	{id:"no_mailinglist", msg:"Es muss eine Kontaktgruppe vor dem Speichern ausgewählt werden", buttons:["dialog_ok"]},
	{id:"no_subject", msg:"Es muss ein Betreff vor dem Speichern definiert werden", buttons:["dialog_ok"]},
	{id:"no_test_mail", msg:"Für das Senden eines Tests muss eine Test E-Mail Adresse definiert sein", buttons:["dialog_ok"]},
	{id:"sent_test_mail", msg:"Das Testmail wurde erfolgreich versendet", buttons:["dialog_ok"]},
	{id:"sent_campaign", msg:"Der Newsletter wird um ${additional_info} versendet", buttons:["dialog_ok"]},
	{id:"delete_campaign", title:"Der Newsletter wird unwiederruflich gelöscht", msg:"Möchten Sie fortfahren?", buttons:["dialog_yes", "dialog_cancel"]},
	{id:"no_file_upload_auth", msg:"Der API Key vom FTP Server muss definiert sein, wenn sie Dateien hochladen möchten.", buttons:["dialog_ok"]},
	{id:"undefined_settings", msg:"Der API Key vom Infomaniak Newsletter und alle Einstellungen müssen definiert sein, um das Programm nutzen zu können.", buttons:["dialog_ok"]},
	{id:"newsletter_programmed", title:"Speichern nicht möglich", msg:"Dieser Newsletter wird momentan versandt. Das Editieren ist erst möglich, sobald der Newsletter an alle Empfänger versendet wurde.", buttons:["dialog_ok"]},
	{id:"delete_forbidden", title:"Löschen nicht möglich", msg:"Dieser Newsletter wird momentan versandt. Das Löschen ist erst möglich, sobald der Newsletter an alle Empfänger versendet wurde.", buttons:["dialog_ok"]},
	{id:"already_sent", title:"Senden nicht möglich", msg:"Dieser Newsletter wird momentan versandt. Das erneute Senden ist erst möglich, sobald der Newsletter an alle Empfänger versendet wurde.", buttons:["dialog_ok"]},
	{id:"delete_mailinglist", title:"Die Kontaktgruppe wird unwiederruflich gelöscht", msg:"Möchten Sie fortfahren?", buttons:["dialog_yes", "dialog_cancel"]},
]

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