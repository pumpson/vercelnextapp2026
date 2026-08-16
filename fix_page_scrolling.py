import re

with open('app/games/tokyo-train-sugoroku/page.tsx', 'r') as f:
    content = f.read()

# Make sure main has `overflow-hidden` so its children dictate scrolling,
# preventing the whole page from scrolling.
search_main = '<main className="flex-1 flex flex-col md:flex-row relative">'
replace_main = '<main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">'

content = content.replace(search_main, replace_main)

# Let's check how the right sidebar is styled.
