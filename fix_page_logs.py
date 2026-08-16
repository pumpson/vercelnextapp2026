import re

with open('app/games/tokyo-train-sugoroku/page.tsx', 'r') as f:
    content = f.read()

# We no longer need logsEndRef or the useEffect that scrolls to bottom because new messages are at the top.
# Let's remove them.
content = re.sub(r'  const logsEndRef = useRef<HTMLDivElement>\(null\);\n\n  // ログが追加されたら自動スクロール\n  useEffect\(\(\) => \{\n    logsEndRef\.current\?\.scrollIntoView\(\{ behavior: "smooth" \}\);\n  \}, \[gameState\.logs\]\);\n', '', content)

# And remove `<div ref={logsEndRef} />`
content = content.replace("<div ref={logsEndRef} />", "")

# Ensure the main flex container handles height properly
# The user mentioned: "また、ログがスクロールされると、右側の情報も一緒にスクロールされてしまう。"
# This means the parent is probably scrolling instead of the log div.
# Let's check `className="flex-1 flex flex-col md:flex-row relative"`
# Wait, let's see how `main` and its children are styled.
