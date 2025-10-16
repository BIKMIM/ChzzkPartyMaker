import { useEffect, useRef, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import axios from 'axios'
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
      jobs: [ { specificity: '야수', role: '딜러' }, { specificity: '사격', role: '딜러' }, { specificity: '생존', role: '딜러' } ]
    },
    {
      class: '도적', image: wowRogue, color: '#FFF569',
      jobs: [ { specificity: '암살', role: '딜러' }, { specificity: '무법', role: '딜러' }, { specificity: '잠행', role: '딜러' } ]
    },
    {
      class: '기원사', image: wowEvoker, color: '#33937F',
      jobs: [ { specificity: '황폐', role: '딜러' }, { specificity: '보존', role: '힐러' }, { specificity: '증강', role: '딜러' } ]
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
      class: '드루이드', image: wowDruid, color: '#FF7D0A',
      jobs: [ { specificity: '조화', role: '딜러' }, { specificity: '야성', role: '딜러' }, { specificity: '수호', role: '탱커' }, { specificity: '회복', role: '힐러' } ]
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
    if (role === 'streamer' && msg === '파티') setIsShow(true)
    if (msg === '취소') {
      setMembers((prev) =>
        prev.filter((m) => !(m.nick === nick && !m.selected))
      )
      return
    }
    const matchedData = findWoWClassBySpecificity(msg)
    if (matchedData) {
      setMembers((prev) => {
        const existingIndex = prev.findIndex(member => member.nick === nick)
        if (existingIndex === -1) {
          return [...prev, {
            nick: nick,
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
            nick: nick,
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

  const getChatChannelID = async (): Promise<string> => {
    try {
      const params = new URLSearchParams(window.location.search)
      const chzzkID = params.get('chzzk')
      const data = await axios.get(
        `https://api.chzzk.naver.com/polling/v2/channels/${chzzkID}/live-status`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      )
      if (data) {
        const liveStatus = data.data.content
        return liveStatus.chatChannelID
      }
      throw new Error('no data')
    } catch (error) {
      throw error
    }
  }

  const connectWebSocket = () => {
    const ssID = Math.floor(Math.random() * 10) + 1
    const serverUrl = `wss://kr-ss${ssID}.chat.naver.com/chat`

    const socket = new WebSocket(serverUrl)
    socketRef.current = socket

    socket.addEventListener('open', async () => {
      const chatChannelID = await getChatChannelID()
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
      {isShow && (
        <div className="w-[950px] h-[800px] bg-black bg-opacity-80 border border-gray-600 flex rounded-2xl overflow-hidden shadow-2xl">
          {isRolling && selectedMember && (
            <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-2xl shadow-2xl animate-bounce">
                <div className="text-4xl font-bold text-center mb-4">🎀</div>
                <div className="text-2xl text-lime-400 font-bold mb-2">{selectedMember.nick}</div>
                <div className="text-lg text-gray-600">{selectedMember.job}</div>
                <div className="text-lg text-gray-600">{selectedMember.role}</div>
              </div>
            </div>
          )}

          {/* 왼쪽: 대기 멤버 - 200px 유지 */}
          <div className="w-[150px] h-[800px] border-r border-gray-700 overflow-y-auto p-2 bg-gray-900 bg-opacity-50">
            {[...members].reverse().filter(member => !member.selected).map((member, index) => {
              const classImage = wowClasses.find(c => c.class === member.class)?.image
              return (
                <div
                  key={index}
                  className="group h-16 w-full mb-2 [perspective:1000px]"
                >
                  <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    <div
                      className="absolute inset-0 border border-gray-500 p-2 rounded-lg bg-gray-800 bg-opacity-80 [backface-visibility:hidden] flex items-center justify-end"
                      style={{
                        backgroundImage: classImage ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${classImage})` : 'none',
                        backgroundSize: 'contain',
                        backgroundPosition: 'left center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      <div className="text-right">
                        <span className="text-xs text-gray-300">{member.role}</span>
                        <span className="text-xs text-gray-300 mx-1">|</span>
                        <span className="text-xs text-gray-400">{member.job}</span>
                        <div className="font-semibold text-sm text-white mt-0.5">{member.nick}</div>
                      </div>
                    </div>
                    <div className="absolute inset-0 border border-gray-400 p-2 rounded-lg bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setMembers((prev) =>
                            prev.map((m) =>
                              m.nick === member.nick ? { ...m, selected: true } : m
                            )
                          )
                        }}
                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                      >
                        패스
                      </button>
                      <button
                        onClick={() => {
                          setMembers((prev) =>
                            prev.filter((m) => m.nick !== member.nick)
                          )
                        }}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 중간: 선택된 멤버 - 600px 유지 */}
          <div className="w-[500px] h-[800px] border-r border-gray-700 grid grid-cols-3 gap-4 p-4 overflow-y-auto bg-gray-800 bg-opacity-30">
            {members
              .filter(member => member.selected)
              .sort((a, b) => {
                const roleOrder: Record<string, number> = { '탱커': 0, '딜러': 1, '힐러': 2 };
                return roleOrder[a.role] - roleOrder[b.role]
              })
              .map((member, index) => {
                const classImage = wowClasses.find(c => c.class === member.class)?.image
                return (
                  <div
                    key={index}
                    className="group h-16 [perspective:1000px]"
                  >
                    <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                      <div
                        className="absolute inset-0 border border-gray-500 p-2 rounded-lg bg-gray-800 bg-opacity-80 [backface-visibility:hidden] flex items-center justify-end"
                        style={{
                          backgroundImage: classImage ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${classImage})` : 'none',
                          backgroundSize: 'contain',
                          backgroundPosition: 'left center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      >
                        <div className="text-right">
                          <span className="text-xs text-gray-300">{member.role}</span>
                          <span className="text-xs text-gray-300 mx-1">|</span>
                          <span className="text-xs text-gray-400">{member.job}</span>
                          <div className="font-semibold text-sm text-white mt-0.5">{member.nick}</div>
                        </div>
                      </div>
                      <div className="absolute inset-0 border border-gray-400 p-2 rounded-lg bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                        <button
                          onClick={() => {
                            setMembers((prev) =>
                              prev.filter((m) => m.nick !== member.nick)
                            )
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors font-semibold"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* 오른쪽: 안내 및 버튼 - 200px → 400px */}
          <div className="w-[300px] h-[800px] p-4 overflow-y-auto bg-gray-900 bg-opacity-50">
            <div className="mb-4">
              <h3 className="font-bold text-lg mb-2 text-white">신청 방법</h3>
              <p className="text-xs text-gray-300 mb-3">
                채팅에 자신의 특성을 입력해주세요
              </p>
            </div>

            {/* 클래스 목록 - 높이 절반으로 축소 */}
            <div className="space-y-2 mb-4 grid grid-cols-2 gap-2">
              {wowClasses.map((wowClass) => (
                <div
                  key={wowClass.class}
                  className="cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => handleRandomByClass(wowClass.class)}
                >
                  <div className="flex items-center gap-1.5">
                    <img
                      src={wowClass.image}
                      alt={wowClass.class}
                      className="w-6 h-6 rounded-md flex-shrink-0"
                    />
                    {wowClass.jobs.map((job) => (
                      <span
                        key={job.specificity}
                        className="text-xs px-1.5 py-0.5 rounded border"
                        style={{
                          borderColor: wowClass.color,
                          color: wowClass.color
                        }}
                      >
                        {job.specificity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 border-t border-gray-700 pt-3">
              <h3 className="font-bold text-lg mb-2 text-white">취소 방법</h3>
              <p className="text-xs text-gray-300 mb-3">
                채팅에 <span className="text-white font-bold px-1.5 py-0.5 bg-red-900 bg-opacity-30 rounded">취소</span>를 입력해주세요
              </p>
            </div>

            {/* 랜덤 선택 버튼 - 한 줄로 배치 */}
            <div className="mb-4 border-t border-gray-700 pt-3">
              <h3 className="font-bold text-lg mb-3 text-white">랜덤 선택</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRandomAll}
                  disabled={isRolling}
                  className="px-2 py-2 bg-gray-700 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
                >
                  🎲 랜덤
                </button>
                <button
                  onClick={() => handleRandomByRole('탱커')}
                  disabled={isRolling}
                  className="px-2 py-2 bg-gray-700 text-white text-xs rounded-lg hover:bg-sky-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
                >
                  🛡️ 탱커
                </button>
                <button
                  onClick={() => handleRandomByRole('딜러')}
                  disabled={isRolling}
                  className="px-2 py-2 bg-gray-700 text-white text-xs rounded-lg hover:bg-rose-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
                >
                  ⚔️ 딜러
                </button>
                <button
                  onClick={() => handleRandomByRole('힐러')}
                  disabled={isRolling}
                  className="px-2 py-2 bg-gray-700 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
                >
                  ⚕️ 힐러
                </button>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <div className="border-t border-gray-700 pt-3">
              <button
                onClick={() => {
                  setMembers([])
                  setSelectedMember(null)
                  setIsShow(false)
                }}
                className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold"
              >
                🚫 종료
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
