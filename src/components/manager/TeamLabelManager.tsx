import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Plus, Save, Tag, Trash2, Users, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { useTaskMutations } from '../../hooks/useTaskMutations';
import type { BoardPayload, Label, TeamMember } from '../../lib/types';
import type { ConfirmOptions, Toast } from '../../lib/uiTypes';
import { randomColor, readableError } from '../../lib/utils';
import { Avatar } from '../shared/Avatar';
import { useDialogFocus } from '../shared/useDialogFocus';

export function TeamLabelManager({
  open,
  boardId,
  board,
  onClose,
  notify,
  confirm,
}: {
  open: boolean;
  boardId: string | null;
  board?: BoardPayload;
  onClose: () => void;
  notify: (tone: Toast['tone'], message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}) {
  const [memberName, setMemberName] = useState('');
  const [labelName, setLabelName] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [memberEdits, setMemberEdits] = useState<Record<string, { name: string; color: string }>>({});
  const [labelEdits, setLabelEdits] = useState<Record<string, { name: string; color: string }>>({});
  const mutations = useTaskMutations(boardId);
  const memberInputRef = useRef<HTMLInputElement | null>(null);

  useDialogFocus(open, onClose, memberInputRef);

  async function addMember() {
    if (!memberName.trim()) return;
    try {
      await mutations.createTeamMember.mutateAsync({ name: memberName, color: randomColor(board?.teamMembers.length ?? 0) });
      setMemberName('');
      notify('success', 'Team member added');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function addLabel() {
    if (!labelName.trim()) return;
    try {
      await mutations.createLabel.mutateAsync({ name: labelName, color: randomColor(board?.labels.length ?? 0) });
      setLabelName('');
      notify('success', 'Label added');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function removeMember(member: TeamMember) {
    const confirmed = await confirm({
      title: 'Delete team member?',
      message: `"${member.name}" will be removed from the workspace and unassigned from tasks.`,
      confirmLabel: 'Delete member',
    });
    if (!confirmed) return;

    try {
      await mutations.deleteTeamMember.mutateAsync(member.id);
      notify('success', 'Team member deleted');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function removeLabel(label: Label) {
    const confirmed = await confirm({
      title: 'Delete label?',
      message: `"${label.name}" will be removed from the workspace and from any tagged tasks.`,
      confirmLabel: 'Delete label',
    });
    if (!confirmed) return;

    try {
      await mutations.deleteLabel.mutateAsync(label.id);
      notify('success', 'Label deleted');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  function startMemberEdit(member: TeamMember) {
    setEditingMemberId(member.id);
    setMemberEdits((current) => ({ ...current, [member.id]: { name: member.name, color: member.color } }));
  }

  function startLabelEdit(label: Label) {
    setEditingLabelId(label.id);
    setLabelEdits((current) => ({ ...current, [label.id]: { name: label.name, color: label.color } }));
  }

  async function saveMember(member: TeamMember) {
    const edit = memberEdits[member.id];
    if (!edit?.name.trim()) return;
    try {
      await mutations.updateTeamMember.mutateAsync({ id: member.id, input: { name: edit.name.trim(), color: edit.color } });
      setEditingMemberId(null);
      notify('success', 'Team member saved');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  async function saveLabel(label: Label) {
    const edit = labelEdits[label.id];
    if (!edit?.name.trim()) return;
    try {
      await mutations.updateLabel.mutateAsync({ id: label.id, input: { name: edit.name.trim(), color: edit.color } });
      setEditingLabelId(null);
      notify('success', 'Label saved');
    } catch (error) {
      notify('error', readableError(error));
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="manager-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-panel-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="drawer-header">
              <div>
                <span className="drawer-kicker">Workspace setup</span>
                <h2 id="manager-panel-title">Team & labels</h2>
              </div>
              <button className="icon-button" onClick={onClose} type="button" aria-label="Close team and labels">
                <X size={18} />
              </button>
            </div>
            <div className="manager-grid">
              <section className="manager-card">
                <h3>
                  <Users size={16} />
                  Team members
                </h3>
                <div className="inline-create">
                  <input ref={memberInputRef} value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Add member" />
                  <button className="icon-button" onClick={() => void addMember()} type="button" aria-label="Add team member">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="manager-list">
                  {(board?.teamMembers ?? []).map((member) => (
                    <div className="manager-row" key={member.id}>
                      <Avatar member={member} />
                      {editingMemberId === member.id ? (
                        <div className="manager-edit-fields">
                          <input
                            value={memberEdits[member.id]?.name ?? member.name}
                            onChange={(event) =>
                              setMemberEdits((current) => ({
                                ...current,
                                [member.id]: { name: event.target.value, color: current[member.id]?.color ?? member.color },
                              }))
                            }
                            aria-label={`Edit ${member.name} name`}
                          />
                          <input
                            type="color"
                            value={memberEdits[member.id]?.color ?? member.color}
                            onChange={(event) =>
                              setMemberEdits((current) => ({
                                ...current,
                                [member.id]: { name: current[member.id]?.name ?? member.name, color: event.target.value },
                              }))
                            }
                            aria-label={`Edit ${member.name} color`}
                          />
                        </div>
                      ) : (
                        <span>{member.name}</span>
                      )}
                      {editingMemberId === member.id ? (
                        <button className="mini-button" onClick={() => void saveMember(member)} type="button" aria-label={`Save ${member.name}`}>
                          <Save size={13} />
                        </button>
                      ) : (
                        <button className="mini-button" onClick={() => startMemberEdit(member)} type="button" aria-label={`Edit ${member.name}`}>
                          <Pencil size={13} />
                        </button>
                      )}
                      <button className="mini-button" onClick={() => void removeMember(member)} type="button" aria-label={`Delete ${member.name}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <section className="manager-card">
                <h3>
                  <Tag size={16} />
                  Labels
                </h3>
                <div className="inline-create">
                  <input value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="Add label" />
                  <button className="icon-button" onClick={() => void addLabel()} type="button" aria-label="Add label">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="manager-list">
                  {(board?.labels ?? []).map((label) => (
                    <div className="manager-row" key={label.id}>
                      <span className="picker-color" style={{ background: label.color }} />
                      {editingLabelId === label.id ? (
                        <div className="manager-edit-fields">
                          <input
                            value={labelEdits[label.id]?.name ?? label.name}
                            onChange={(event) =>
                              setLabelEdits((current) => ({
                                ...current,
                                [label.id]: { name: event.target.value, color: current[label.id]?.color ?? label.color },
                              }))
                            }
                            aria-label={`Edit ${label.name} name`}
                          />
                          <input
                            type="color"
                            value={labelEdits[label.id]?.color ?? label.color}
                            onChange={(event) =>
                              setLabelEdits((current) => ({
                                ...current,
                                [label.id]: { name: current[label.id]?.name ?? label.name, color: event.target.value },
                              }))
                            }
                            aria-label={`Edit ${label.name} color`}
                          />
                        </div>
                      ) : (
                        <span>{label.name}</span>
                      )}
                      {editingLabelId === label.id ? (
                        <button className="mini-button" onClick={() => void saveLabel(label)} type="button" aria-label={`Save ${label.name}`}>
                          <Save size={13} />
                        </button>
                      ) : (
                        <button className="mini-button" onClick={() => startLabelEdit(label)} type="button" aria-label={`Edit ${label.name}`}>
                          <Pencil size={13} />
                        </button>
                      )}
                      <button className="mini-button" onClick={() => void removeLabel(label)} type="button" aria-label={`Delete ${label.name}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
