/**
 * Champ anti-robot : invisible et inaccessible au clavier pour une personne,
 * mais rempli automatiquement par la plupart des robots de spam.
 */
export function ChampPiege({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
    >
      <label htmlFor={id}>Ne pas remplir ce champ</label>
      <input
        id={id}
        name="nb_ref"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
