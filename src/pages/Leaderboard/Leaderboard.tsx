import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { DefaultPageSEO } from '../../components/common/PageSEO/PageSEO'
import './Leaderboard.css'

type LeaderboardEntry = {
  rank: number
  name: string
  handle: string
  wallet: string
  posts: number
  score: number
}

const LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Goon',
    handle: '@Goon_crypto',
    wallet: '0x73b6bdf237eD04f40E5684f3e5718F9239B5d64a',
    posts: 9,
    score: 145.0,
  },
  {
    rank: 2,
    name: 'zagen',
    handle: '@0xzagen',
    wallet: '0x1aad084517ea492a67fcca54048c7e0404ce1ab2',
    posts: 5,
    score: 110.0,
  },
  {
    rank: 3,
    name: '100xDarren',
    handle: '@100xDarren',
    wallet: '0x6E74c2a17fB723998ddFd1e21815e9b3932e13FD',
    posts: 1,
    score: 101.0,
  },
  {
    rank: 4,
    name: 'Conan.eth',
    handle: '@0oweekend59',
    wallet: '0xa25CA0AB85421292725Ebda66e07CC792b14F021',
    posts: 18,
    score: 88.0,
  },
  {
    rank: 5,
    name: '3DMax_Virtuals',
    handle: '@3DMax_Virtuals',
    wallet: '-',
    posts: 2,
    score: 75.0,
  },
  {
    rank: 6,
    name: 'JBCollins',
    handle: '@jbcollins01',
    wallet: '0x4ca432c4698db24259810d3696c2048a69906891',
    posts: 13,
    score: 73.5,
  },
  {
    rank: 7,
    name: 'Biz Brain',
    handle: '@bizbrainzuni',
    wallet: '0xd5A065E5c38c7d87f6890e920f4e1aCc9722d97a',
    posts: 15,
    score: 71.7,
  },
  {
    rank: 8,
    name: 'MEDICO',
    handle: '@Drkhaleefah2',
    wallet: '0xb0c7084fc05ed9827683dc38766a93d083af6c4',
    posts: 46,
    score: 66.9,
  },
  {
    rank: 9,
    name: 'Ayyaras',
    handle: '@OxAybars',
    wallet: '0x2C8B5f6E7CFbaA12226E288Eb75624016cD1727',
    posts: 11,
    score: 65.0,
  },
  {
    rank: 10,
    name: 'Crispy',
    handle: '@0xcrispdal',
    wallet: '0x8a5348b3f0c9be7dfdb96f5a3ebc25b6047e306',
    posts: 12,
    score: 63.8,
  },
  {
    rank: 11,
    name: 'office2crypto',
    handle: '@office2crypto',
    wallet: '0x97Bc998dBD5D5a9df74Cb589F4eabd516D4a22A',
    posts: 4,
    score: 63.0,
  },
]

function rankLabel(rank: number) {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return `${rank}`
}

function averageScore(score: number, posts: number) {
  if (posts === 0) return '0.0'
  return (score / posts).toFixed(1)
}

function avatarSeed(name: string) {
  return Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

const Leaderboard = () => {
  return (
    <div className="leaderboard-page">
      <DefaultPageSEO path="/leaderboard" />
      <motion.div
        className="leaderboard-shell"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Wallet</th>
                <th className="is-right">Posts</th>
                <th className="is-right">Score</th>
                <th className="is-right">Avg</th>
              </tr>
            </thead>
            <tbody>
              {LEADERBOARD_ENTRIES.map((entry) => (
                <tr key={entry.rank}>
                  <td>
                    <span className={`rank-value rank-${entry.rank}`}>{rankLabel(entry.rank)}</span>
                  </td>
                  <td>
                    <div className="user-cell">
                      <span
                        className="user-avatar"
                        style={{ '--avatar-seed': avatarSeed(entry.name) } as CSSProperties}
                        aria-hidden="true"
                      >
                        {entry.name[0].toUpperCase()}
                      </span>
                      <div className="user-copy">
                        <p className="user-name">{entry.name}</p>
                        <p className="user-handle">{entry.handle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="wallet-cell">{entry.wallet}</td>
                  <td className="is-right">{entry.posts}</td>
                  <td className="is-right score-cell">{entry.score.toFixed(1)}</td>
                  <td className="is-right">{averageScore(entry.score, entry.posts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

export default Leaderboard
