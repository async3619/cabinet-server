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

export interface FourChanAPIEndpoints extends Endpoints {
  'GET /boards.json': Route<FourChanBoardsResponse>
}
