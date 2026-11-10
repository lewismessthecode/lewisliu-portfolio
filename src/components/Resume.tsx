import { useState } from 'react'

type Language = 'en' | 'zh'

const pdf = {
  en: '/resume/lewis-liu-resume-en.pdf',
  zh: '/resume/lewis-liu-resume-zh.pdf',
}

export default function Resume({ pages }: { readonly pages: { readonly en: string; readonly zh: string } }) {
  const [language, setLanguage] = useState<Language>('en')
  return <div className="resume-window">
    <div className="resume-toolbar" role="toolbar" aria-label="Resume">
      <div className="resume-languages" role="group" aria-label="Language">
        <button className={`resume-btn${language === 'en' ? ' resume-btn--active' : ''}`} type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
        <button className={`resume-btn${language === 'zh' ? ' resume-btn--active' : ''}`} type="button" aria-pressed={language === 'zh'} onClick={() => setLanguage('zh')}>中文</button>
      </div>
      <a className="resume-pdf" href={pdf[language]} download>PDF ↓</a>
    </div>
    <div className="resume-page">
      <article className="resume-doc" lang={language === 'en' ? 'en' : 'zh-CN'} dangerouslySetInnerHTML={{ __html: pages[language] }} />
    </div>
  </div>
}
