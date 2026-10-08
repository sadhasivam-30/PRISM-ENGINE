"""One-off: convert sarash_model.pt (PyTorch) + scaler (joblib) into torch-free files.
Reads the .pt zip with a restricted unpickler (no torch needed)."""
import pickle, zipfile, json, sys, numpy as np, joblib
from collections import OrderedDict

src_pt, src_scaler, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]

class Storage:
    def __init__(self, key, dtype): self.key, self.dtype = key, dtype
def rebuild(storage, offset, size, stride, *a, **k):
    return ("T", storage, offset, tuple(size), tuple(stride))
class U(pickle.Unpickler):
    def find_class(self, mod, name):
        if name == "_rebuild_tensor_v2": return rebuild
        if mod == "torch" and name.endswith("Storage"):
            return name
        if mod == "collections" and name == "OrderedDict": return OrderedDict
        if mod == "torch" and name == "Size": return tuple
        if mod.startswith("torch"): return lambda *a, **k: None
        return super().find_class(mod, name)
    def persistent_load(self, pid):
        _, stype, key, loc, n = pid
        return Storage(key, "float32" if "Float" in str(stype) else "int64")

z = zipfile.ZipFile(src_pt)
pkl = [n for n in z.namelist() if n.endswith("data.pkl")][0]
root = pkl.rsplit("/", 1)[0]
bundle = U(z.open(pkl)).load()

def tensor(t):
    _, st, off, size, stride = t
    raw = z.read(f"{root}/data/{st.key}")
    arr = np.frombuffer(raw, dtype=np.float32 if st.dtype=="float32" else np.int64)
    n = int(np.prod(size)) if size else 1
    return arr[off:off+n].reshape(size).astype(np.float64)

sd = {k: tensor(v) for k, v in bundle["state_dict"].items() if isinstance(v, tuple) and v and v[0]=="T"}
print({k: v.shape for k, v in sd.items()})
sc = joblib.load(src_scaler)
np.savez(f"{out_dir}/sarash_weights.npz", **sd, scaler_mean=sc.mean_, scaler_scale=sc.scale_)
meta = {k: bundle[k] for k in ["feature_cols","dims","career_profiles","career_cost_lakh","market_seed"]}
meta["input_dim"] = int(bundle["input_dim"])
json.dump(meta, open(f"{out_dir}/sarash_meta.json","w"), indent=1)
print(json.dumps(meta)[:1500])
print([k for k in bundle.keys()])
