// app/layout.js
export const metadata = {
  title: 'Attendance-System', // العنوان الجديد للتاب
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  )
}