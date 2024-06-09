# Infomaniak-Newsletter-Interface
Simpler Interface for the [Newsletter Tool of Infomaniak](https://www.infomaniak.com/de/marketing-events/newsletter-tool)

Built with [Tauri](https://tauri.app/) and [Quill](https://quilljs.com/) and powered by
* [Resize images by scrapooo](https://github.com/scrapooo/quill-resize-module)
* Currently not enabled:
	* [Typo.js by Christopher Finke](https://github.com/cfinke/Typo.js)
	* [Better tables by soccerloway](https://github.com/soccerloway/quill-better-table)

## API keys safety
In the current state of the programm, the API keys are only poorly secured. All settings are “encrypted” via XOR and stored in this form. The key for the encryption always remains the same. If anyone would like to improve this, pull request are welcome.