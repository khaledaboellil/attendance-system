// components/LanguageSwitcher.tsx
"use client"
import { useLanguage } from '@/context/LanguageContext'

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    return (
        <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 8,
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 4
            }}
        >
            <span>{language === 'ar' ? '🇺🇸' : '🇸🇦'}</span>
            {language === 'ar' ? 'English' : 'العربية'}
        </button>
    )
}