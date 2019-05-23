var computed = require('mutant/computed')
var nest = require('depnest')

exports.needs = nest({
  'keys.sync.id': 'first',
  'contact.obs': {
    followers: 'first',
    following: 'first',
    blockers: 'first',
    blocking: 'first',
    ignores: 'first'
  }
})

exports.gives = nest('profile.obs.contact')

exports.create = function (api) {
  return nest('profile.obs.contact', function (id) {
    var yourId = api.keys.sync.id()
    var yourFollowing = api.contact.obs.following(yourId)
    var yourFollowers = api.contact.obs.followers(yourId)
    var yourBlocking = api.contact.obs.blocking(yourId)

    var followers = api.contact.obs.followers(id)
    var following = api.contact.obs.following(id)

    var sync = computed([followers.sync, following.sync, yourFollowing.sync, yourFollowers.sync], (...x) => x.every(Boolean))

    var blockers = api.contact.obs.blockers(id)
    var ignores = api.contact.obs.ignores()

    // allow override of block status if explicit ignore state set
    var youBlock = computed([yourBlocking], function (yourBlocking) {
      return yourBlocking.includes(id)
    })

    var hidden = computed([blockers, ignores], function (blockers, ignores) {
      return ignores[id] == null ? blockers.includes(yourId) : ignores[id]
    })

    // allow override of block status if explicit ignore state set
    var youIgnore = computed([blockers, ignores], function (blockers, ignores) {
      return ignores[id] === true
    })

    var youFollow = computed([yourFollowing], function (yourFollowing) {
      return yourFollowing.includes(id)
    })

    var yourFriends = computed([yourFollowers, yourFollowing], inAllSets)

    var blockingFriends = computed([yourFollowers, yourFollowing, blockers], inAllSets)
    var mutualFriends = computed([yourFollowers, yourFollowing, followers, following], inAllSets)
    var outgoingVia = computed([yourFollowers, following], inAllSets)
    var incomingVia = computed([yourFollowing, followers], inAllSets)

    var hasOutgoing = computed([yourFollowers, following], (a, b) => {
      return a.some((id) => b.includes(id))
    })
    var hasIncoming = computed([followers, yourFollowing], (a, b) => {
      return a.some((id) => b.includes(id))
    })

    var isYou = computed([yourId, id], (a, b) => a === b)

    var isNotFollowingAnybody = computed([following, following.sync], (following, sync) => {
      return sync && (!following || !following.length)
    })

    var hasNoFollowers = computed([followers, followers.sync], (followers, sync) => {
      return sync && (!followers || !followers.length)
    })

    return {
      followers,
      following,
      blockers,
      blockingFriends,
      blockingFriendsCount: count(blockingFriends),
      mutualFriends,
      mutualFriendsCount: count(mutualFriends),
      outgoingVia,
      outgoingViaCount: count(outgoingVia),
      incomingVia,
      incomingViaCount: count(incomingVia),
      hasOutgoing,
      isNotFollowingAnybody,
      hasNoFollowers,
      noOutgoing: not(hasOutgoing, isYou),
      hasIncoming,
      noIncoming: not(hasIncoming, isYou),
      yourId,
      yourFollowing,
      yourFollowers,
      yourFriends,
      youFollow,
      youBlock,
      youIgnore,
      hidden,
      isYou,
      notFollowing: not(youFollow, isYou),
      sync
    }
  })
}

function inAllSets (first, ...rest) {
  return first.filter(value => rest.every((collection) => collection.includes(value)))
}

function not (obs, isFalse) {
  return computed([obs, isFalse], (x, isFalse) => isFalse ? false : !x)
}

function count (obs) {
  return computed(obs, (x) => x.length)
}
