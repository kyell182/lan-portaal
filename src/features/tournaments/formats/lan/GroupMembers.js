/** Wie telt mee in een groep: spelers minus no-shows, en wie de uitslag moet controleren. */
class GroupMembers {
  static active(group) {
    return group.pids.filter((pid) => !group.removed.includes(pid));
  }

  /** Iedereen behalve de host controleert de uitslag. */
  static reviewers(group) {
    return GroupMembers.active(group).filter((pid) => pid !== group.hostPid);
  }
}

module.exports = GroupMembers;
