import type { Endpoints, Route } from '@/utils/fetcher.types'

interface FourChanBoardsResponse {
  boards: Array<{
    board: string
    bump_limit: number
    code_tags?: number
    cooldowns: {
      images: number
      replies: number
      threads: number
    }
    country_flags?: number
    custom_spoilers?: number
    image_limit: number
    is_archived?: number
    math_tags?: number
    max_comment_chars: number
    max_filesize: number
    max_webm_duration: number
    max_webm_filesize: number
    meta_description: string
    min_image_height?: number
    min_image_width?: number
    oekaki?: number
    pages: number
    per_page: number
    require_subject?: number
    sjis_tags?: number
    spoilers?: number
    text_only?: number
    title: string
    user_ids?: number
    webm_audio?: number
    ws_board: number
  }>
}

interface FourChanCatalogResponse {
  page: number
  threads: Array<{
    bumplimit?: number
    capcode?: string
    closed?: number
    com?: string
    ext: string
    filename: string
    fsize: number
    h: number
    imagelimit?: number
    images: number
    last_modified: number
    md5: string
    name: string
    no: number
    now: string
    omitted_images?: number
    omitted_posts?: number
    replies: number
    resto: number
    semantic_url: string
    sticky?: number
    sub?: string
    tim: number
    time: number
    tn_h: number
    tn_w: number
    trip?: string
    w: number
  }>
}

interface FourChanPostsResponse {
  posts: Array<{
    archived?: number
    archived_on?: number
    bumplimit?: number
    capcode: string
    closed?: number
    com: string
    ext?: string
    filename?: string
    fsize?: number
    h?: number
    imagelimit?: number
    images?: number
    md5?: string
    name: string
    no: number
    now: string
    replies?: number
    resto: number
    semantic_url?: string
    sub?: string
    tim?: number
    time: number
    tn_h?: number
    tn_w?: number
    w?: number
  }>
}

export interface FourChanAPIEndpoints extends Endpoints {
  'GET /:code/catalog.json': Route<FourChanCatalogResponse[]>
  'GET /:code/thread/:no.json': Route<FourChanPostsResponse>
  'GET /boards.json': Route<FourChanBoardsResponse>
}
