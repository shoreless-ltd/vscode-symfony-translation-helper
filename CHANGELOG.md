# Change Log

## [1.3.0](https://marketplace.visualstudio.com/_apis/public/gallery/publishers/shoreless/vsextensions/symfony-translation-helper/1.3.0/vspackage) <span style="font-size: 0.5em">coming soon</span>  

### Added  

- New extension setting `symfonyTranslationHelper.parsingMode`.  
- Twig file parser for Symfony parsing mode supporting `{% trans %}` tag, `trans` filter and `{% trans_default_domain %}` tag to identify translation keys and domain in Twig templates.  

### Changed  

- Introduce extension setting groups to allow distinguishing between setting scopes and ease extension configuration.  
- Extension setting `symfonyTranslationHelper.translationFiles.patterns` language placeholder changed from `[LANGCODE]` to `[LOCALE]`.  
- Extension setting `symfonyTranslationHelper.translationFiles.patterns` default changed from `[DOMAIN].[LANGCODE].yml;[DOMAIN].[LANGCODE].yaml;[DOMAIN].[LANGCODE].json` to `[DOMAIN].[LOCALE].yml;[DOMAIN].[LOCALE].yaml;[DOMAIN].[LOCALE].json`.  

## [1.2.1](https://marketplace.visualstudio.com/_apis/public/gallery/publishers/shoreless/vsextensions/symfony-translation-helper/1.2.1/vspackage) <span style="font-size: 0.5em">2024-07-29</span>  

### Bugfixes  

- Fix duplicated translation annotations and popups when editing documents or switching view modes.  

## [1.2.0](https://marketplace.visualstudio.com/_apis/public/gallery/publishers/shoreless/vsextensions/symfony-translation-helper/1.2.0/vspackage) <span style="font-size: 0.5em">2024-07-28</span>  

### Added  

- Translation domain extraction for language file parsers, with new `[DOMAIN]` placeholder in translation file name pattern.  
- Show translation domain in translation popups, if a domain can be extracted from translation file names.  

### Changed  

- Extension setting `symfonyTranslationHelper.translationFiles.patterns` language placeholder changed from `[LANG]` to `[LANGCODE]`.  
- Extension setting `symfonyTranslationHelper.translationFiles.patterns` default changed from `messages.[LANG].yml,validators.[LANG].yml` to `[DOMAIN].[LANGCODE].yml;[DOMAIN].[LANGCODE].yaml;[DOMAIN].[LANGCODE].json`.  
- Extension setting `symfonyTranslationHelper.translationFiles.folders` default translation folders changed from `**/Resources/translations` to `**/translations` to meet Symfony recommendation to not place translations in the `Resources` folder anymore.  

## [1.1.0](https://marketplace.visualstudio.com/_apis/public/gallery/publishers/shoreless/vsextensions/symfony-translation-helper/1.1.0/vspackage) <span style="font-size: 0.5em">2024-07-27</span>  

### Changed  

- Speed up opening of translation files from within translation popups.  
- Open translation file with selected corresponding translation string.  

## [1.0.0](https://marketplace.visualstudio.com/_apis/public/gallery/publishers/shoreless/vsextensions/symfony-translation-helper/1.0.0/vspackage) <span style="font-size: 0.5em">2024-07-27</span>  

- Initial public release.  
