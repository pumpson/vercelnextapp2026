import re

with open('app/games/tokyo-train-sugoroku/hooks/useSugoroku.ts', 'r') as f:
    content = f.read()

# Change addLog to unshift (or keep pushing but display in reverse, keeping max 50 logs)
search = """  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, message]);
  }, []);"""

replace = """  const addLog = useCallback((message: string) => {
    // 最新のログを上に追加し、最大50件まで保持する
    setLogs(prev => [message, ...prev].slice(0, 50));
  }, []);"""

content = content.replace(search, replace)

with open('app/games/tokyo-train-sugoroku/hooks/useSugoroku.ts', 'w') as f:
    f.write(content)
