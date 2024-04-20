async function create_campaign() {
	var subject = "Test";
	var email_from_name = "PR-Modellbau";
	var lang = "de";
	var email_from_addr = "info@example.ch";
	var content = "<span>My content</span>";
	var mailinglistIds = [226639];

	var string = `"{\"subject\":\"${subject}\",\"email_from_name\":\"${email_from_name}\",\"lang\":\"${lang}\",\"email_from_addr\":\"${email_from_addr}\",\"content\":\"${content}\",\"mailinglistIds\": ${mailinglistIds}}"`

	var response = await window.__TAURI__.invoke('create_campaign', {data:string});

	console.log(response);
}





