import re

with open('app/games/tokyo-train-sugoroku/page.tsx', 'r') as f:
    content = f.read()

# Make sure main has `overflow-hidden`
search_main = '<main className="flex-1 flex flex-col md:flex-row relative">'
replace_main = '<main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">'
content = content.replace(search_main, replace_main)

# Let's remove logsEndRef stuff correctly
content = re.sub(r'  const logsEndRef = useRef<HTMLDivElement>\(null\);\n\n  // ログが追加されたら自動スクロール\n  useEffect\(\(\) => \{\n    logsEndRef\.current\?\.scrollIntoView\(\{ behavior: "smooth" \}\);\n  \}, \[gameState\.logs\]\);\n', '', content)
content = content.replace('<div ref={logsEndRef} />', '')

with open('app/games/tokyo-train-sugoroku/page.tsx', 'w') as f:
    f.write(content)
