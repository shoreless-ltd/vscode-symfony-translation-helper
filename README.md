# Symfony Translation Helper for Visual Studio Code

Visualizes translated strings from YAML translation files in Symfony projects using Inline Decorations & Hover Support.

![Symfony Translation Helper](https://i.imgur.com/kRalsto.png)

## Features

* Supported translation file parsers:
  * YAML (using the `.yaml` or `.yml` translation file extension)  
  * JSON (using the `.json` translation file extension)  
* Shows the translation of a translation key inline.  
* Adds a hover popup to a translation key that shows existing or missing translations for selected target languages.  

## Extension Settings

This extension's default configuration should work for most Symfony projects using one of the supported translation file parsers. If you wish to alter the extension behavior, you can adjust the extension setting values accordingly:  

Open `File` -> `Preferences` -> `Settings` (`Ctrl` + `,`)  
Search for `symfonyTranslationHelper` to find the following settings:  

### Translation consumers  

* `symfonyTranslationHelper.extensions`  
  Extensions of the files consuming translations, separated by semicolons.  
  *Example:* `php;twig`  
* `symfonyTranslationHelper.parsingMode`  
  How to identify translation keys in source code. Available options are:  
  * `generic`: RegEx pattern based translation key search, using the pattern defined in `symfonyTranslationHelper.translationKeyPattern`.  
  * `symfony`: Symfony specific detection where applicable (e.g., within Twig files) and RegEx based as fallback. (May not work as expected for Twig files with custom translation filters or tags that differ from Symfony's default `{% trans %}` tag and `trans` filter. Feature requests with examples for specific Symfony based frameworks are welcome.)  
* `symfonyTranslationHelper.domainSupport`  
  Whether translation domain support is enabled. Automatically true for "symfony" parsing mode.  
* `symfonyTranslationHelper.translationKeyPattern`  
  RegEx pattern used when searching translation keys in source code strings.  
  The default setting is intended for key-based translations and should be changed to `.+` for source language based translations.  
  *Example:* `[a-zA-Z0-9._-]+` *Allows upper and lower case letters from a-z, numbers, dot (`.`), dash (`-`) and underscore (`_`) between one and unlimited times.*  
* `symfonyTranslationHelper.translationKeyMinLength`  
  Translation key minimum length, `0` for no minimum.  
  If a minimum length is given, shorter strings are ignored and not considered to be translation keys.  

### Translation sources  

* `symfonyTranslationHelper.translationFiles.patterns`  
  Filename pattern(s) of the translation file(s), separated by semicolons. Use `[LOCALE]` as language code placeholder, and optionally `[DOMAIN]` as translation domain placeholder.  
  *Example:* `[DOMAIN].[LOCALE].yml` *Finds all `*.yml` YAML language files such as \"messages.en.yml\", \"messages.de.yml\", \"validators.en.yml\", \"validators.de.yml\" and so on.*  
* `symfonyTranslationHelper.translationFiles.folders`  
  Path(s) of the root folder(s) to recursively search for translation files, relative to the workspace root folder, separated by semicolons.  
  Paths listed here support glob placeholders. The pattern `**/translations` would search all translation folders in all bundles of the workspace. However, this search can be very slow. To speed up searching for translation files, using a list of more specific folders is highly recommended.  
  *Example:* `src/translations;src/App/translations;src/MyBundle/translations`  
* `symfonyTranslationHelper.translationFiles.ignored`  
  Folder name(s) ignored when recursively looking for translation files, separated by semicolons.  
  *Example:* `vendor;.git;public`  

### Inline preview  

* `symfonyTranslationHelper.preview.enabled`  
  Whether inline translation previews are enabled.  
  Shows a specific translation of a translation key inline right after the key. See `symfonyTranslationHelper.preview.language` for choosing a translation language.  
* `symfonyTranslationHelper.preview.language`  
  Language to use for showing inline translation previews. If no translation for this language exists, inline translation won't be shown.  
  *Example:* `en`  
* `symfonyTranslationHelper.preview.color`  
  Color of the translation preview text (hex value or html color name).
  *Example:* `green`  

### Hover popups  

* `symfonyTranslationHelper.hover.enabled`  
  Whether hover popups with links to translation sources are enabled.  
* `symfonyTranslationHelper.requiredLanguages`  
  Required languages, separated by semicolons. Indicates missing translations for a found translation string.  
  *Example:* `en;de`  

## Known Issues & Limitations

* The first folder in your workspace will be searched for translation files only.  
* At least one translation in any language must exist for any translation key in your source code, so that this extension identifies it as translation and is able to indicate missing translations in other languages.  
* Concatenated translation keys are not supported.  

## Release Notes

See [Changelog](./CHANGELOG.md) for changes/release notes.  

## Credits and final words  

This extension was originally based on the [Translation Keys Lookup](https://marketplace.visualstudio.com/items?itemName=matthizou.translation-keys-lookup) extension, but provides additional features for use with Symfony translations. Such are parsing nested translation keys in translation files, missing translation detection and providing links for found translation keys that open related translation files.  

Since Symfony (and this extension) support JSON based translation files, and with according pattern and file extension settings, this Visual Studio Code extension may work for i18n based JavaScript applications as well.  
