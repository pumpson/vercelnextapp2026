interface PostProps {
  post: {
    id: string
    title: string
    body: string
  }
}

export function Post({ post }: PostProps) {
  return (
    <li>
      <h2>{post.title}</h2>
      <p>{post.body}</p>
    </li>
  )
}
