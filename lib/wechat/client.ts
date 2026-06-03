interface WeChatAccessToken {
  access_token: string
  expires_at: number
}

let cachedToken: WeChatAccessToken | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60000) {
    return cachedToken.access_token
  }

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APP_ID}&secret=${process.env.WECHAT_APP_SECRET}`
  )

  const data = await res.json()
  if (data.errcode) throw new Error(`WeChat token error: ${data.errmsg}`)

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 300) * 1000,
  }

  return cachedToken.access_token
}

export async function sendTemplateMessage(input: {
  openid: string
  templateId: string
  url: string
  data: Record<string, { value: string; color?: string }>
}) {
  const token = await getAccessToken()

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: input.openid,
        template_id: input.templateId,
        url: input.url,
        data: input.data,
      }),
    }
  )

  const data = await res.json()
  if (data.errcode !== 0) throw new Error(`WeChat template message error: ${data.errmsg}`)
  return data
}

export async function getUserInfo(openid: string) {
  const token = await getAccessToken()

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${token}&openid=${openid}&lang=zh_CN`
  )

  const data = await res.json()
  if (data.errcode) throw new Error(`WeChat user info error: ${data.errmsg}`)
  return data
}
