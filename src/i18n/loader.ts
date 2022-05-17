import i18next, { Resource, ResourceLanguage } from 'i18next';
import translationES from './locales/es/translation.json';
import translationEN from './locales/en/translation.json';
import { askUserInput } from '../utils/promise';
import { GLOBAL } from '../configuration/constants';
import chalk from 'chalk';

const resources: Resource = {
    es: translationES as ResourceLanguage,
    en: translationEN as ResourceLanguage
};
const languageList = Object.keys(resources);

const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
const systemLanguage = new Intl.Locale(systemLocale).language ?? systemLocale;

const initialTranslations: Record<string, Record<string, string>> = {
    es: {
        question: '*********** Español detectado - Pulsa enter para cancelar y usar inglés ***********\n'
    }
};

i18next.init({
    resources,
    fallbackLng: 'en'
});

/**
 * Loads i18n based on user language an preferences
 * @param language Locale language
 */
export async function initializei18n(language?: string): Promise<void> {
    let lng = language;
    // If language is not default
    if (systemLanguage !== 'en') {
        if (languageList.includes(systemLanguage)) {
            // Ask if you want to use your locale language
            const response = await askUserInput(initialTranslations[systemLanguage].question, 3000, 'Y');
            // If so, set it
            lng = response.toUpperCase() === 'Y' ? systemLocale : language;
        } else {
            // Unsupported language message
            console.log(chalk.grey.underline(`\nRight now the language "${_getLanguageFromLocale(systemLocale)}" is not supported.\n`));
            console.log(chalk.grey.underline('If you want to add translations, feel free to submit a pull request to my GitHub project.'));
            console.log(chalk.grey.underline('The app will open in english.\n'));
        }
    }
    await i18next.init({ lng, resources, fallbackLng: 'en' });
}

/**
 * Returns the language from a locale
 * @returns Language name
 */
function _getLanguageFromLocale(locale: string): string {
    const languageNames = new Intl.DisplayNames([locale], { type: 'language' });
    return languageNames.of(locale) ?? GLOBAL.EMPTY_MESSAGE;
}

export default i18next;
