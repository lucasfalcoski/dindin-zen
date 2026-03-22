import { useState } from 'react';
import { useTagsWithStats, useDeleteTag, useUpdateTag } from '@/hooks/useTags';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseRow } from '@/components/ExpenseRow';
import { formatBRL } from '@/lib/format';
import { Trash2, ArrowLeft, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/hooks/useExpenses';

const C = { ink:'#16150f', ink2:'#6b6a63', ink3:'#b0aea6', rule:'#e4e1da', bg:'#f2f0eb', green:'#1a7a45', red:'#b83232', blue:'#1d4ed8' };

export default function Tags() {
  const { user } = useAuth();
  const { data: tags, isLoading } = useTagsWithStats();
  const deleteTag = useDeleteTag();
  const updateTag = useUpdateTag();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState<Record<string, string>>({});

  const { data: tagExpenses } = useQuery({
    queryKey: ['tag_expenses', selectedTagId],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_tags').select('expense_id').eq('tag_id', selectedTagId!);
      if (error) throw error;
      const ids = data.map(d => d.expense_id);
      if (ids.length === 0) return [];
      const { data: expenses, error: expError } = await supabase
        .from('expenses').select('*, expense_groups(id, name, color, icon)').in('id', ids).order('date', { ascending: false });
      if (expError) throw expError;
      return expenses as Expense[];
    },
    enabled: !!selectedTagId,
  });

  const selectedTag = tags?.find(t => t.id === selectedTagId);

  if (selectedTagId && selectedTag) {
    return (
      <div>
        {/* HEADER com back */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
          <button onClick={() => setSelectedTagId(null)} style={{ width:'36px', height:'36px', borderRadius:'10px', border:`1px solid ${C.rule}`, background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.ink2 }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'4px' }}>tag</p>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:'28px', color:C.ink }}>{selectedTag.name}</span>
              <span style={{ padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:600, border:`1.5px solid ${selectedTag.color}`, color:selectedTag.color }}>
                {tagExpenses?.length || 0} despesas
              </span>
            </div>
          </div>
        </div>

        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
            <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Despesas com esta tag</span>
          </div>
          {tagExpenses && tagExpenses.length > 0 ? (
            <div>{tagExpenses.map(e => <ExpenseRow key={e.id} expense={e} />)}</div>
          ) : (
            <p style={{ fontSize:'13px', color:C.ink3, padding:'32px', textAlign:'center' }}>Nenhuma despesa com esta tag.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'28px', paddingBottom:'20px', borderBottom:`1px solid ${C.rule}` }}>
        <div>
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:C.ink3, marginBottom:'6px' }}>organização</p>
          <h1 style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'34px', lineHeight:1, letterSpacing:'-0.5px', color:C.ink }}>Tags</h1>
        </div>
        <p style={{ fontSize:'12px', color:C.ink3 }}>Gerencie tags nas despesas</p>
      </div>

      {isLoading ? (
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'16px 20px', borderBottom:`1px solid ${C.rule}` }}>
              <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:C.rule }} />
              <div style={{ flex:1, height:'12px', background:C.rule, borderRadius:'4px' }} />
            </div>
          ))}
        </div>
      ) : tags && tags.length > 0 ? (
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.rule}` }}>
            <span style={{ fontSize:'12px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', color:C.ink2 }}>Suas tags</span>
          </div>
          {tags.map(tag => (
            <div key={tag.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 20px', borderBottom:`1px solid ${C.rule}`, transition:'background .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = C.bg}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'none'}
            >
              {/* Color picker */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <input
                  type="color"
                  value={editingColor[tag.id] || tag.color}
                  onChange={e => {
                    setEditingColor(prev => ({ ...prev, [tag.id]: e.target.value }));
                    updateTag.mutate({ id: tag.id, color: e.target.value });
                  }}
                  style={{ width:'22px', height:'22px', borderRadius:'50%', border:`2px solid ${tag.color}`, cursor:'pointer', padding:0, appearance:'none', background:'transparent' }}
                  title="Clique para mudar a cor"
                />
              </div>

              {/* Tag pill */}
              <button onClick={() => setSelectedTagId(tag.id)} style={{ flex:1, textAlign:'left', border:'none', background:'none', cursor:'pointer' }}>
                <span style={{ padding:'4px 12px', borderRadius:'100px', fontSize:'12px', fontWeight:600, border:`1.5px solid ${tag.color}`, color:tag.color, display:'inline-block' }}>
                  {tag.name}
                </span>
              </button>

              {/* Stats */}
              <div style={{ display:'flex', alignItems:'center', gap:'16px', fontSize:'12px', color:C.ink3 }}>
                <span>{tag.count} despesas</span>
                <span style={{ fontWeight:600, color:C.ink, fontFamily:"'Instrument Serif',serif", fontSize:'15px' }}>{formatBRL(tag.total)}</span>
              </div>

              {/* Delete */}
              <button onClick={() => deleteTag.mutate(tag.id)}
                style={{ width:'28px', height:'28px', borderRadius:'6px', border:'none', background:'none', color:C.ink3, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', flexShrink:0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5dede'; (e.currentTarget as HTMLButtonElement).style.color = C.red; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = C.ink3; }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background:'#fff', border:`1px solid ${C.rule}`, borderRadius:'14px', padding:'48px', textAlign:'center' }}>
          <Tag style={{ width:'32px', height:'32px', color:C.ink3, margin:'0 auto 12px' }} />
          <p style={{ color:C.ink2, fontWeight:600 }}>Nenhuma tag criada.</p>
          <p style={{ fontSize:'13px', color:C.ink3, marginTop:'4px' }}>Adicione tags nas suas despesas para organizar melhor.</p>
        </div>
      )}
    </div>
  );
}
