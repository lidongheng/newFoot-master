/**
 * 与 clubMatchAnalyzer 一致的首发 11 人推断（纯函数，供 analyzer 与 teamProfileGenerator 共用）
 */

const { getPositionsForFormation } = require('./predictedStartingLineup');

const POSITION_GROUPS = {
  GK: ['GK'],
  DF: ['CB', 'LB', 'RB', 'LCB', 'RCB', 'LWB', 'RWB'],
  MF: ['CDM', 'CM', 'LM', 'RM', 'CAM', 'LDM', 'RDM', 'LCM', 'RCM', 'LAM', 'RAM'],
  FW: ['CF', 'ST', 'LW', 'RW'],
};

/** @type {Record<string, string>} */
const POSITION_TO_GROUP = {};
Object.entries(POSITION_GROUPS).forEach(([group, posArray]) => {
  posArray.forEach((pos) => {
    POSITION_TO_GROUP[pos] = group;
  });
});

/**
 * @param {string} targetPosition
 * @param {Object} playerPositions
 * @returns {boolean}
 */
function isCompatiblePosition(targetPosition, playerPositions) {
  if (playerPositions[targetPosition] && playerPositions[targetPosition] > 0) {
    return true;
  }

  const positionGroups = {
    GK: ['GK'],
    CB: ['CB', 'LCB', 'RCB'],
    LB: ['LB', 'LWB'],
    RB: ['RB', 'RWB'],
    CDM: ['CDM', 'CM', 'LDM', 'RDM'],
    CM: ['CM', 'CDM', 'CAM', 'LCM', 'RCM'],
    CAM: ['CAM', 'CM', 'CF', 'LAM', 'RAM'],
    LM: ['LM', 'LW', 'LWB', 'LAM'],
    RM: ['RM', 'RW', 'RWB', 'RAM'],
    ST: ['ST', 'CF', 'LW', 'RW'],
    CF: ['CF', 'ST', 'CAM'],
    LW: ['LW', 'LM', 'ST', 'CF'],
    RW: ['RW', 'RM', 'ST', 'CF'],
    LWB: ['LWB', 'LB', 'LM'],
    RWB: ['RWB', 'RB', 'RM'],
    LCB: ['LCB', 'CB', 'LB'],
    RCB: ['RCB', 'CB', 'RB'],
    LDM: ['LDM', 'CDM', 'LCM'],
    RDM: ['RDM', 'CDM', 'RCM'],
    LCM: ['LCM', 'CM', 'LDM', 'LAM'],
    RCM: ['RCM', 'CM', 'RDM', 'RAM'],
    LAM: ['LAM', 'CAM', 'LCM', 'LW'],
    RAM: ['RAM', 'CAM', 'RCM', 'RW'],
  };

  const compatiblePositions = positionGroups[targetPosition] || [];
  for (const position of compatiblePositions) {
    if (playerPositions[position] && playerPositions[position] > 0) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Record<string, object>|object[]} playersData 球衣号键字典或球员数组
 * @param {string} formation
 * @returns {object[]}
 */
function determineStartingLineup(playersData, formation) {
  if (!formation) {
    return [];
  }

  const rawList = Array.isArray(playersData)
    ? playersData
    : Object.values(playersData || {});
  if (rawList.length === 0) {
    return [];
  }

  const positions = getPositionsForFormation(formation);
  if (!positions || positions.length !== 11) {
    return [];
  }

  const playersWithPositionPreferences = rawList.map((player) => {
    const posObj =
      player.positions && typeof player.positions === 'object' ? player.positions : {};
    const positionsByFrequency = Object.entries(posObj)
      .filter(([pos]) => pos !== 'Unknown' && pos !== 'Substitute')
      .sort((a, b) => b[1] - a[1]);

    let mainPositionGroup = 'MF';
    if (positionsByFrequency.length > 0) {
      const mainPosition = positionsByFrequency[0][0];
      mainPositionGroup = POSITION_TO_GROUP[mainPosition] || 'MF';
    }

    return {
      ...player,
      positionPreferences: positionsByFrequency.map(([pos]) => pos),
      positionsWithCounts: Object.fromEntries(positionsByFrequency),
      mainPositionGroup,
    };
  });

  const sortedPlayers = playersWithPositionPreferences.sort(
    (a, b) => (b.lineups || 0) - (a.lineups || 0)
  );

  const candidateCount = Math.min(16, sortedPlayers.length);
  const candidateCount11 = Math.min(11, sortedPlayers.length);
  const candidatePlayers = sortedPlayers.slice(0, candidateCount);

  const requiredPositionGroupCount = {
    GK: positions.filter((p) => POSITION_TO_GROUP[p] === 'GK').length,
    DF: positions.filter((p) => POSITION_TO_GROUP[p] === 'DF').length,
    MF: positions.filter((p) => POSITION_TO_GROUP[p] === 'MF').length,
    FW: positions.filter((p) => POSITION_TO_GROUP[p] === 'FW').length,
  };

  const selectedPlayersByGroup = {};
  Object.keys(POSITION_GROUPS).forEach((group) => {
    selectedPlayersByGroup[group] = candidatePlayers
      .filter((p) => p.mainPositionGroup === group)
      .slice(0, requiredPositionGroupCount[group]);
  });

  let selectedPlayers = [].concat(...Object.values(selectedPlayersByGroup));

  if (selectedPlayers.length < candidateCount11) {
    const selectedPlayerNames = new Set(selectedPlayers.map((p) => p.name));
    const remainingPlayers = candidatePlayers.filter((p) => !selectedPlayerNames.has(p.name));
    const additionalPlayers = remainingPlayers.slice(
      0,
      candidateCount11 - selectedPlayers.length
    );
    selectedPlayers = [...selectedPlayers, ...additionalPlayers];
  }

  const positionCandidates = {};
  positions.forEach((position) => {
    positionCandidates[position] = [];
  });

  selectedPlayers.forEach((player) => {
    const playerMainGroup = player.mainPositionGroup;

    positions.forEach((position) => {
      const posGroup = POSITION_TO_GROUP[position] || 'MF';

      let suitabilityScore = 0;

      if (posGroup === 'GK' && playerMainGroup !== 'GK') {
        suitabilityScore = -1000;
      } else if (playerMainGroup === 'GK' && posGroup !== 'GK') {
        suitabilityScore = -1000;
      } else if (playerMainGroup === 'DF' && posGroup === 'FW') {
        suitabilityScore = -800;
      } else if (playerMainGroup === 'FW' && posGroup === 'DF') {
        suitabilityScore = -800;
      } else if (playerMainGroup !== posGroup) {
        suitabilityScore = -300;
      }

      if (player.positionsWithCounts[position]) {
        suitabilityScore += player.positionsWithCounts[position] * 1000;
      } else {
        for (let i = 0; i < player.positionPreferences.length; i++) {
          const prefPos = player.positionPreferences[i];
          if (isCompatiblePosition(position, { [prefPos]: 1 })) {
            const preferenceWeight =
              (player.positionPreferences.length - i) / player.positionPreferences.length;
            suitabilityScore += player.positionsWithCounts[prefPos] * preferenceWeight * 100;
            break;
          }
        }
      }

      suitabilityScore += (player.lineups || 0) * 5;

      positionCandidates[position].push({
        player,
        suitabilityScore,
      });
    });
  });

  Object.keys(positionCandidates).forEach((position) => {
    positionCandidates[position].sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  });

  const finalLineup = [];
  const assignedPlayers = new Set();

  const gkPosition = positions.find((p) => p === 'GK');
  if (gkPosition) {
    const gkCandidate = positionCandidates[gkPosition].find(
      (c) => c.player.mainPositionGroup === 'GK' && !assignedPlayers.has(c.player.name)
    );

    if (gkCandidate) {
      assignedPlayers.add(gkCandidate.player.name);
      finalLineup.push({
        ...gkCandidate.player,
        recommendedPosition: gkPosition,
      });
    }
  }

  const positionGroupOrder = ['DF', 'MF', 'FW'];

  positionGroupOrder.forEach((group) => {
    const groupPositions = positions.filter(
      (p) => POSITION_TO_GROUP[p] === group && p !== 'GK'
    );

    for (const position of groupPositions) {
      if (position === 'GK') continue;

      const bestCandidate = positionCandidates[position].find(
        (candidate) => !assignedPlayers.has(candidate.player.name)
      );

      if (bestCandidate) {
        assignedPlayers.add(bestCandidate.player.name);
        finalLineup.push({
          ...bestCandidate.player,
          recommendedPosition: position,
        });
      }
    }
  });

  if (finalLineup.length < candidateCount11) {
    const remainingCandidates = selectedPlayers
      .filter((p) => !assignedPlayers.has(p.name))
      .sort((a, b) => (b.lineups || 0) - (a.lineups || 0));

    const remainingPositions = positions.filter(
      (p) => !finalLineup.some((player) => player.recommendedPosition === p)
    );

    for (let i = 0; i < remainingPositions.length && i < remainingCandidates.length; i++) {
      const position = remainingPositions[i];
      const player = remainingCandidates[i];

      finalLineup.push({
        ...player,
        recommendedPosition: position,
      });
    }
  }

  return finalLineup;
}

module.exports = {
  determineStartingLineup,
  isCompatiblePosition,
  getPositionsForFormation,
};
