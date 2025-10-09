import { useEffect, useRef, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

import wowDeathKnight from '@/assets/deathknight.png'
import wowDemonHunter from '@/assets/demon_hunter.png'
import wowDruid from '@/assets/druid.png'
import wowEvoker from '@/assets/evoker.png'
import wowHunter from '@/assets/hunter.png'
import wowMage from '@/assets/mage.png'
import wowMonk from '@/assets/monk.png'
import wowPaladin from '@/assets/paladin.png'
import wowPriest from '@/assets/priest.png'
import wowRogue from '@/assets/rogue.png'
import wowShaman from '@/assets/shaman.png'
import wowWarlock from '@/assets/warlock.png'
import wowWarrior from '@/assets/warrior.png'

interface ChzzkMessageBody {
  profile: string
  extras: string
  msg: string
  msgTime: number
}

interface ChzzkProfile {
  userRoleCode: string
  nickname: string
}

interface ChzzkData {
  cmd: number
  bdy?: ChzzkMessageBody[]
}

interface Member {
  class: string
  nick: string
  role: string
  job: string
  selected: boolean
}

interface WoWClasses {
  class: string
  image: string
  color: string
  jobs: WoWJobs[]
}

interface WoWJobs {
  specificity: string
  role: string
}

interface MatchedWoWData {
  class: string
  image: string
  color: string
  specificity: string
  role: string
}

function App() {
  const [members, setMembers] = useState<Member[]>([])
  const [isShow, setIsShow] = useState<boolean>(false)
  const [isRolling, setIsRolling] = useState(false)
  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const isManualCloseRef = useRef(false)
  const wowClasses: WoWClasses[] = [
    {
      class: '전사', image: wowWarrior, color: '#C79C6E',
      jobs: [ { specificity: '무기', role: '딜러' }, { specificity: '분노', role: '딜러' }, { specificity: '방어', role: '탱커' } ]
    },
    {
      class: '성기사', image: wowPaladin, color: '#F58CBA',
      jobs: [ { specificity: '보호', role: '탱커' }, { specificity: '징벌', role: '딜러' }, { specificity: '신기', role: '힐러' } ]
    },
    {
      class: '죽음의기사', image: wowDeathKnight, color: '#C41F3B',
      jobs: [ { specificity: '혈기', role: '탱커' }, { specificity: '냉죽', role: '딜러' }, { specificity: '부정', role: '딜러' } ]
    },
    {
      class: '주술사', image: wowShaman, color: '#0070DE',
      jobs: [ { specificity: '정기', role: '딜러' }, { specificity: '고양', role: '딜러' }, { specificity: '복원', role: '힐러' } ]
    },
    {
      class: '사냥꾼', image: wowHunter, color: '#ABD473',
      jobs: [ { specificity: '야수', role: '딜러' }, { specificity: '사격', role: '딜러' }, { specificity: '생존', role: '힐러' } ]
    },
    {
      class: '도적', image: wowRogue, color: '#FFF569',
      jobs: [ { specificity: '암살', role: '딜러' }, { specificity: '무법', role: '딜러' }, { specificity: '잠행', role: '딜러' } ]
    },
    {
      class: '드루이드', image: wowDruid, color: '#FF7D0A',
      jobs: [ { specificity: '조화', role: '딜러' }, { specificity: '야성', role: '딜러' }, { specificity: '수호', role: '탱커' }, { specificity: '회복', role: '힐러' } ]
    },
    {
      class: '악마사냥꾼', image: wowDemonHunter, color: '#A330C9',
      jobs: [ { specificity: '복수', role: '탱커' }, { specificity: '파멸', role: '딜러' } ]
    },
    {
      class: '수도사', image: wowMonk, color: '#00FF96',
      jobs: [ { specificity: '양조', role: '탱커' }, { specificity: '풍운', role: '딜러' }, { specificity: '운무', role: '힐러' } ]
    },
    {
      class: '마법사', image: wowMage, color: '#69CCF0',
      jobs: [ { specificity: '냉법', role: '딜러' }, { specificity: '화염', role: '딜러' }, { specificity: '비전', role: '딜러' } ]
    },
    {
      class: '흑마법사', image: wowWarlock, color: '#9482C9',
      jobs: [ { specificity: '악마', role: '딜러' }, { specificity: '파괴', role: '딜러' }, { specificity: '고통', role: '딜러' } ]
    },
    {
      class: '사제', image: wowPriest, color: '#FFFFFF',
      jobs: [ { specificity: '수양', role: '힐러' }, { specificity: '신사', role: '힐러' }, { specificity: '암흑', role: '딜러' } ]
    },
    {
      class: '기원사', image: wowEvoker, color: '#33937F',
      jobs: [ { specificity: '황폐', role: '딜러' }, { specificity: '보존', role: '힐러' }, { specificity: '증강', role: '딜러' } ]
    }
  ]

  const findWoWClassBySpecificity = (msg: string): MatchedWoWData | null => {
    const searchTerm = msg.toLowerCase()

    for (const classData of wowClasses) {
      const matchedJob = classData.jobs.find(job => job.specificity === searchTerm)
      if (matchedJob) return {
        class: classData.class,
        image: classData.image,
        color: classData.color,
        specificity: matchedJob.specificity,
        role: matchedJob.role
      }
    }
    return null
  }

  const checkMessage = (role: string, nick: string, msg: string)=> {
    if (role !== 'common_user' && msg === '파티') setIsShow(true)
    if (isShow) {
      if (msg === '취소') {
        setMembers([])
        setSelectedMember(null)
        return
      } else {
        const matchedData = findWoWClassBySpecificity(msg)
        if (matchedData) {
          setMembers((prev) => {
            const existingIndex = prev.findIndex(member => member.nick === nick)
            if (existingIndex === -1) {
              return [...prev, {
                nick,
                class: matchedData.class,
                role: matchedData.role,
                job: matchedData.specificity,
                selected: false
              }]
            }
            if (!prev[existingIndex].selected) {
              const updated = [...prev]
              updated[existingIndex] = {
                ...updated[existingIndex],
                class: matchedData.class,
                role: matchedData.role,
                job: matchedData.specificity
              }
              return updated
            }
            return prev
          })
        }
      }
    }
  }

  const connectWebSocket = () => {
    const ssID = Math.floor(Math.random() * 10) + 1
    const serverUrl = `wss://kr-ss${ssID}.chat.naver.com/chat`

    const socket = new WebSocket(serverUrl)
    socketRef.current = socket

    socket.addEventListener('open', () => {
      const params = new URLSearchParams(window.location.search)
      const chatChannelID = params.get('chzzk')
      if (!chatChannelID) return
      const option = {
        ver: '2',
        cmd: 100,
        svcid: 'game',
        cid: chatChannelID,
        bdy: { devType: 2001, auth: 'READ' },
        tid: 1
      }
      socket.send(JSON.stringify(option))
    })

    socket.addEventListener('message', (event) => {
      const data: ChzzkData = JSON.parse(event.data)

      if (data.bdy && Symbol.iterator in Object(data.bdy)) {
        for (const body of data.bdy) {
          const profile: ChzzkProfile = JSON.parse(body.profile)
          checkMessage(profile.userRoleCode, profile.nickname, body.msg)
        }
      }
      if (data.cmd === 0) socket.send(JSON.stringify({ ver: '2', cmd: 10000 }))
      if (data.cmd === 10100) socket.send(JSON.stringify({ ver: '2', cmd: 0 }))
    })

    socket.addEventListener('close', () => {
      if (!isManualCloseRef.current) connectWebSocket()
    })

    socket.addEventListener('error', (error) => {
      console.error('WebSocket 오류:', error)
    })
  }

  const rollupAnimation = (targetMembers: typeof members) => {
    if (targetMembers.length === 0) {
      toast('선택 가능한 멤버가 없습니다')
      return
    }
    setIsRolling(true)
    let counter = 0
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * targetMembers.length)
      setSelectedMember(targetMembers[randomIndex])
      counter++

      if (counter > 20) {
        clearInterval(interval)
        const finalIndex = Math.floor(Math.random() * targetMembers.length)
        const selected = targetMembers[finalIndex]
        setSelectedMember(selected)
        setTimeout(() => {
          setMembers((prev) =>
            prev.map((m) =>
              m.nick === selected.nick ? { ...m, selected: true } : m
            )
          )
          setIsRolling(false)
          setSelectedMember(null)
        }, 1000)
      }
    }, 100)
  }

  const handleRandomAll = () => {
    const available = members.filter(m => !m.selected)
    rollupAnimation(available)
  }

  const handleRandomByRole = (role: string) => {
    const available = members.filter(m => !m.selected && m.role === role)
    rollupAnimation(available)
  }

  const handleRandomByClass = (className: string) => {
    const available = members.filter(m => !m.selected && m.job &&
      wowClasses.find(wc => wc.class === className)?.jobs.some(j => j.specificity === m.job)
    )
    rollupAnimation(available)
  }

  useEffect(() => {
    connectWebSocket()
    const handleBeforeUnload = () => {
      isManualCloseRef.current = true
      socketRef.current?.close()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      isManualCloseRef.current = true
      socketRef.current?.close()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div
        className="w-[800px] h-[800px] bg-black bg-opacity-80 border border-b-green-300 flex"
        style={{ display: isShow ? 'block' : 'none' }}
      >
        {isRolling && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl animate-bounce">
              <div className="text-4xl font-bold text-center mb-4">🎰</div>
              <div className="text-2xl font-bold mb-2">{selectedMember.nick}</div>
              <div className="text-lg text-gray-600">{selectedMember.job}</div>
              <div className="text-lg text-gray-600">{selectedMember.role}</div>
            </div>
          </div>
        )}

        <div className="w-[200px] h-[800px] border border-b-blue-300 overflow-y-auto p-2">
          {[...members].reverse().filter(member => !member.selected).map((member, index) => (
            <div
              key={index}
              className="group h-32 w-full mb-2 [perspective:1000px]"
            >
              <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                <div className="absolute inset-0 border border-gray-300 p-4 rounded bg-white [backface-visibility:hidden]">
                  <div className="text-sm text-gray-600">{member.job}</div>
                  <div className="text-sm text-gray-600">{member.role}</div>
                  <div className="font-semibold">{member.nick}</div>
                </div>
                <div className="absolute inset-0 border border-gray-300 p-4 rounded bg-gray-50 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setMembers((prev) =>
                        prev.map((m) =>
                          m.nick === member.nick ? { ...m, selected: true } : m
                        )
                      )
                    }}
                    className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                  >
                    패스
                  </button>
                  <button
                    onClick={() => {
                      setMembers((prev) =>
                        prev.filter((m) => m.nick !== member.nick)
                      )
                    }}
                    className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="w-[400px] h-[800px] border border-b-green-300 grid grid-cols-2 gap-4 p-4 overflow-y-auto">
          {members
            .filter(member => member.selected)
            .sort((a, b) => {
              const roleOrder: Record<string, number> = { '탱커': 0, '딜러': 1, '힐러': 2 };
              return roleOrder[a.role] - roleOrder[b.role]
            })
            .map((member, index) => (
              <div
                key={index}
                className="group h-32 [perspective:1000px]"
              >
                <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                  <div className="absolute inset-0 border border-gray-300 p-4 rounded bg-white [backface-visibility:hidden] flex flex-col justify-center">
                    <div className="text-sm text-gray-600">{member.job}</div>
                    <div className="text-sm text-gray-600">{member.role}</div>
                    <div className="font-semibold">{member.nick}</div>
                  </div>
                  <div className="absolute inset-0 border border-gray-300 p-4 rounded bg-red-50 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                    <button
                      onClick={() => {
                        setMembers((prev) =>
                          prev.filter((m) => m.nick !== member.nick)
                        )
                      }}
                      className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors font-semibold"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="w-[200px] h-[800px] border border-b-blue-300 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2">신청 방법</h3>
            <p className="text-sm text-gray-600 mb-4">
              채팅에 자신의 특성을 입력해주세요
            </p>
          </div>
          <div className="space-y-3 mb-6">
            {wowClasses.map((wowClass) => (
              <div
                key={wowClass.class}
                className="border-b pb-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors"
                onClick={() => handleRandomByClass(wowClass.class)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={wowClass.image}
                    alt={wowClass.class}
                    className="w-8 h-8 rounded"
                  />
                  <span
                    className="font-bold"
                    style={{ color: wowClass.color }}
                  >
                  {wowClass.class}
                </span>
                </div>
                <div className="flex flex-wrap gap-1 ml-10">
                  {wowClass.jobs.map((job) => (
                    <span
                      key={job.specificity}
                      className="text-xs px-2 py-1 rounded border"
                      style={{
                        borderColor: wowClass.color,
                        color: wowClass.color
                      }}
                    >
                    /{job.specificity}
                  </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2">취소 방법</h3>
            <p className="text-sm text-gray-600 mb-4">
              채팅에 <span className="text-red-600 font-bold">취소</span>를 입력해주세요
            </p>
          </div>
          <div className="mb-4 border-t pt-4">
            <h3 className="font-bold text-lg mb-3 text-white">랜덤 선택</h3>
            <div className="space-y-2">
              <button
                onClick={handleRandomAll}
                disabled={isRolling}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                🎲 랜덤
              </button>
              <button
                onClick={() => handleRandomByRole('탱커')}
                disabled={isRolling}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                🛡️ 탱커
              </button>
              <button
                onClick={() => handleRandomByRole('딜러')}
                disabled={isRolling}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                ⚔️ 딜러
              </button>
              <button
                onClick={() => handleRandomByRole('힐러')}
                disabled={isRolling}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                ⚕️ 힐러
              </button>
            </div>
          </div>
          <div>
            <button
              onClick={() => setIsShow(false)}
              className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-semibold"
            >
              🚫 종료
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
