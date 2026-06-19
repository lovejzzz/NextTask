import type { TeamMember } from '../../lib/types';
import { initials } from '../../lib/utils';

export function AvatarStack({ members }: { members: TeamMember[] }) {
  if (!members.length) return <span className="unassigned">Unassigned</span>;
  return (
    <div className="avatar-stack">
      {members.slice(0, 3).map((member) => (
        <Avatar member={member} key={member.id} />
      ))}
      {members.length > 3 ? <span className="avatar-overflow">+{members.length - 3}</span> : null}
    </div>
  );
}

export function Avatar({ member }: { member: TeamMember }) {
  return (
    <span className="avatar" style={{ background: member.color }} title={member.name}>
      {member.avatar_url ? <img src={member.avatar_url} alt="" /> : initials(member.name)}
    </span>
  );
}
